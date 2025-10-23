let clienteEditId = null;

// Función para asegurar que la tabla tenga un encabezado con 'ID'
function asegurarEncabezado() {
    const table = document.getElementById('tabla-proveedores');
    if (!table) return;

    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        const tr = document.createElement('tr');
        ['ID', 'Nombre', 'Vehículo', 'Teléfono', 'Dirección', 'Acciones'].forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
        table.insertBefore(thead, table.firstChild);
    } else {
        const headerRow = thead.querySelector('tr');
        if (!headerRow) return;
        const firstTh = headerRow.querySelector('th');
        if (!firstTh || firstTh.textContent.trim().toLowerCase() !== 'id') {
            const idTh = document.createElement('th');
            idTh.textContent = 'ID';
            headerRow.insertBefore(idTh, headerRow.firstChild);
        }
    }
}

// Cargar clientes desde la API
function cargarClientes() {
    asegurarEncabezado();

    fetch('http://127.0.0.1:5001/api/clientes')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener clientes');
            return res.json();
        })
        .then(data => {
            const tbody = document.querySelector('#tabla-clientes tbody');
            if (!tbody) {
                console.error('No se encontró #tabla-clientes tbody en el DOM');
                return;
            }
            tbody.innerHTML = '';
            data.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.id_cliente ?? ''}</td>
                    <td>${cliente.nombre || ''}</td>
                    <td>${cliente.vehiculo || ''}</td>
                    <td>${cliente.telefono || ''}</td>
                    <td>${cliente.direccion || ''}</td>
                    <td>
                        <button class="btn-editar" data-id="${cliente.id_cliente ?? ''}">Editar</button>
                        <button class="btn-eliminar" data-id="${cliente.id_cliente ?? ''}">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Asignar eventos después de renderizar
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id_cliente = this.dataset.id;
                    if (!id_cliente) {
                        alert('ID de cliente no definido.');
                        return;
                    }
                    abrirModalEdicion(id_cliente);
                });
            });

            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id_cliente = this.dataset.id;
                    if (!id_cliente) {
                        alert('ID de cliente no definido.');
                        return;
                    }
                    if (confirm('¿Eliminar cliente?')) eliminarCliente(id_cliente), alert('Cliente eliminado.');

                });
            });
        })
        .catch(err => console.error(err));
}

// Función para abrir el modal de edición
function abrirModalEdicion(id_cliente) {
    // Obtener datos del cliente y abrir modal con valores
    fetch(`http://127.0.0.1:5001/api/clientes`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener clientes');
            return res.json();
        })
        .then(data => {
            const cliente = data.find(c => String(c.id_cliente) === String(id_cliente));
            if (!cliente) {
                alert('Cliente no encontrado');
                return;
            }
            clienteEditId = cliente.id_cliente;
            const nombreEl = document.getElementById('editar-nombre');
            const vehiculoEl = document.getElementById('editar-vehiculo');
            const telefonoEl = document.getElementById('editar-telefono');
            const direccionEl = document.getElementById('editar-direccion');
            if (nombreEl) nombreEl.value = cliente.nombre || '';
            if (vehiculoEl) vehiculoEl.value = cliente.vehiculo || '';
            if (telefonoEl) telefonoEl.value = cliente.telefono || '';
            if (direccionEl) direccionEl.value = cliente.direccion || '';

            const modal = document.getElementById('modal-edicion');
            if (modal) modal.style.display = 'flex';
        })
        .catch(err => console.error(err));
}

// Función global llamada desde el HTML onclick
function cerrarModal() {
    clienteEditId = null;
    const modal = document.getElementById('modal-edicion');
    if (modal) modal.style.display = 'none';
}

// Función para eliminar un cliente
function eliminarCliente(id_cliente) {
    fetch(`http://127.0.0.1:5001/api/clientes/${id_cliente}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Error al eliminar');
            cargarClientes();
        })
        .catch(err => console.error(err));
}

// Función para agregar un cliente
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-edicion');
    if (modal) modal.style.display = 'none';

    cargarClientes();

    const btnFiltrar = document.getElementById('btn-filtrar-clientes');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            const filtro = document.getElementById('busqueda-clientes').value.toLowerCase();
            const filas = document.querySelectorAll('#tabla-clientes tbody tr');
            filas.forEach(fila => {
                const nombre = fila.children[1].textContent.toLowerCase();
                const vehiculo = fila.children[2].textContent.toLowerCase();
                fila.style.display = (nombre.includes(filtro) || vehiculo.includes(filtro)) ? '' : 'none';
            });
        });
    }

    // Agregar cliente
    const btnAgregar = document.getElementById('btn-agregar-cliente');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            const nombre = document.getElementById('nuevo-nombre').value.trim();
            const vehiculo = document.getElementById('nuevo-vehiculo').value.trim();
            const telefono = document.getElementById('nuevo-telefono').value.trim();
            const direccion = document.getElementById('nuevo-direccion').value.trim();

            if (!nombre) {
                alert('El nombre es obligatorio.');
                return;
            }

            fetch('http://127.0.0.1:5001/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, vehiculo, telefono, direccion })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Error al agregar cliente');
                    return res.json();
                })
                .then(() => {
                    // Limpiar campos y recargar tabla
                    document.getElementById('nuevo-nombre').value = '';
                    document.getElementById('nuevo-vehiculo').value = '';
                    document.getElementById('nuevo-telefono').value = '';
                    document.getElementById('nuevo-direccion').value = '';
                    cargarClientes();
                })
                .catch(err => console.error(err));
        });
    }

    // Submit del formulario de edición
    const formEditar = document.getElementById('form-editar');
    if (formEditar) {
        formEditar.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!clienteEditId) return alert('ID de cliente no definido.');

            // Obtener valores de los campos
            const nombre = document.getElementById('editar-nombre').value.trim();
            const vehiculo = document.getElementById('editar-vehiculo').value.trim();
            const telefono = document.getElementById('editar-telefono').value.trim();
            const direccion = document.getElementById('editar-direccion').value.trim();

            if (!nombre) {
                return alert('El nombre es obligatorio.');
            }

            // Enviar solicitud PUT para actualizar el cliente
            fetch(`http://127.0.0.1:5001/api/clientes/${clienteEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, vehiculo, telefono, direccion })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Error al actualizar cliente');
                    return res.json();
                })
                .then(() => {
                    cerrarModal();
                    cargarClientes();
                })
                .catch(err => {
                    console.error(err);
                    alert('No se pudo actualizar el cliente. Intenta nuevamente.');
                });
        });
    }

    // Cerrar modal al hacer click fuera del contenido
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal-edicion');
        if (e.target === modal) cerrarModal();
    });
});

// Exponer cerrarModal globalmente
window.cerrarModal = cerrarModal;