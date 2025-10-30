let proveedorEditId = null;

// Función para asegurar que la tabla tenga un encabezado con 'ID'
function asegurarEncabezado() {
    const table = document.getElementById('tabla-proveedores');
    if (!table) return;

    let thead = table.querySelector('thead');
    if (!thead) {
        thead = document.createElement('thead');
        const tr = document.createElement('tr');
            ['ID', 'Nombre', 'CUIT', 'Teléfono', 'Acciones'].forEach(text => {
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

// Cargar proveedores desde la API
function cargarProveedores() {
    asegurarEncabezado();

    fetch('http://localhost:5001/api/proveedor')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener proveedores');
            return res.json();
        })
        .then(data => {
                const tbody = document.querySelector('#tabla-proveedores tbody');
            if (!tbody) {
                console.error('No se encontró #tabla-proveedores tbody en el DOM');
                return;
            }
            tbody.innerHTML = '';
            data.forEach(proveedor => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${proveedor.id_proveedor ?? ''}</td>
                    <td>${proveedor.nombre || ''}</td>
                    <td>${proveedor.cuit || ''}</td>
                    <td>${proveedor.telefono || ''}</td>
                    <td>
                        <button class="btn-editar" data-id="${proveedor.id_proveedor ?? ''}">Editar</button>
                        <button class="btn-eliminar" data-id="${proveedor.id_proveedor ?? ''}">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Asignar eventos después de renderizar
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', function() {
                        const id_proveedor = this.dataset.id;
                    if (!id_proveedor) {
                        alert('ID de proveedor no definido.');
                        return;
                    }
                    abrirModalEdicion(id_proveedor);
                });
            });

            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', function() {
                const id_proveedor = this.dataset.id;
                    if (!id_proveedor) {
                        alert('ID de proveedor no definido.');
                        return;
                    }
                    if (confirm('¿Eliminar proveedor?')) {
                        eliminarProveedor(id_proveedor);
                        alert('Proveedor eliminado.');
                    }

                });
            });
        })
        .catch(err => console.error(err));
}

// Función para abrir el modal de edición
function abrirModalEdicion(id_proveedor) {
    // Obtener datos del cliente y abrir modal con valores
    fetch(`http://localhost:5001/api/proveedor`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener proveedores');
            return res.json();
        })
        .then(data => {
        const proveedor = data.find(p => String(p.id_proveedor) === String(id_proveedor));
            if (!proveedor) {
                alert('Proveedor no encontrado');
                return;
            }
            proveedorEditId = proveedor.id_proveedor;
            const nombreEl = document.getElementById('editar-nombre');
            const cuitEl = document.getElementById('editar-cuit');
            const telefonoEl = document.getElementById('editar-telefono');
            if (nombreEl) nombreEl.value = proveedor.nombre || '';
            if (cuitEl) cuitEl.value = proveedor.cuit || '';
            if (telefonoEl) telefonoEl.value = proveedor.telefono || '';

            const modal = document.getElementById('modal-edicion');
            if (modal) modal.style.display = 'flex';
        })
        .catch(err => console.error(err));
}

// Función global llamada desde el HTML onclick
function cerrarModal() {
    proveedorEditId = null;
    const modal = document.getElementById('modal-edicion');
    if (modal) modal.style.display = 'none';
}

// Función para eliminar un cliente
function eliminarProveedor(id_proveedor) {
    fetch(`http://localhost:5001/api/proveedor/${id_proveedor}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Error al eliminar');
            cargarProveedores();
        })
        .catch(err => console.error(err));
}

// Función para agregar un cliente
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-edicion');
    if (modal) modal.style.display = 'none';

    cargarProveedores();

    const btnFiltrar = document.getElementById('btn-filtrar-proveedor');
    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            const filtro = document.getElementById('busqueda-proveedor').value.toLowerCase();
            const filas = document.querySelectorAll('#tabla-proveedores tbody tr');
            filas.forEach(fila => {
                const nombre = fila.children[1].textContent.toLowerCase();
                const cuit = fila.children[2].textContent.toLowerCase();
                fila.style.display = (nombre.includes(filtro) || cuit.includes(filtro)) ? '' : 'none';
            });
        });
    }

    // Agregar proveedor
const btnAgregar = document.getElementById('btn-agregar-proveedor');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            const nombre = document.getElementById('nuevo-nombre').value.trim();
            const cuit = document.getElementById('nuevo-cuit').value.trim();
            const telefono = document.getElementById('nuevo-telefono').value.trim();

            if (!nombre) {
                alert('El nombre es obligatorio.');
                return;
            }

            fetch('http://localhost:5001/api/proveedor', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, cuit, telefono })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Error al agregar proveedor');
                    return res.json();
                })
                .then(() => {
                    // Limpiar campos y recargar tabla
                    document.getElementById('nuevo-nombre').value = '';
                    document.getElementById('nuevo-cuit').value = '';
                    document.getElementById('nuevo-telefono').value = '';
                    cargarProveedores();
                })
                .catch(err => console.error(err));
        });
    }

    // Submit del formulario de edición
    const formEditar = document.getElementById('form-editar-proveedor');
    if (formEditar) {
        formEditar.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!proveedorEditId) return alert('ID de proveedor no definido.');

            // Obtener valores de los campos
            const nombre = document.getElementById('editar-nombre').value.trim();
            const cuit = document.getElementById('editar-cuit').value.trim();
            const telefono = document.getElementById('editar-telefono').value.trim();

            if (!nombre) {
                return alert('El nombre es obligatorio.');
            }

            // Enviar solicitud PUT para actualizar el cliente
            fetch(`http://localhost:5001/api/proveedor/${proveedorEditId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nombre, cuit, telefono })
                })
                .then(res => {
                    if (!res.ok) throw new Error('Error al actualizar proveedor');
                    return res.json();
                })
                .then(() => {
                    cerrarModal();
                    cargarProveedores();
                })
                .catch(err => {
                    console.error(err);
                    alert('No se pudo actualizar el proveedor. Intenta nuevamente.');
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