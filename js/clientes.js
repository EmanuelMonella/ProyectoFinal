// Script completo para cargar clientes, abrir/cerrar modal y CRUD básico.

let clienteEditId = null;

// Cargar clientes al inicio
function cargarClientes() {
    fetch('http://127.0.0.1:5001/api/clientes')
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener clientes');
            return res.json();
        })
        .then(data => {
            const tbody = document.querySelector('#tabla-clientes tbody');
            tbody.innerHTML = '';
            data.forEach(cliente => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cliente.nombre || ''}</td>
                    <td>${cliente.vehiculo || ''}</td>
                    <td>${cliente.telefono || ''}</td>
                    <td>${cliente.direccion || ''}</td>
                    <td>
                        <button class="btn-editar" data-id="${cliente.id}">Editar</button>
                        <button class="btn-eliminar" data-id="${cliente.id}">Eliminar</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // asignar eventos despues de renderizar
            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.dataset.id;
                    abrirModalEdicion(id);
                });
            });

            document.querySelectorAll('.btn-eliminar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const id = this.dataset.id;
                    if (confirm('¿Eliminar cliente?')) eliminarCliente(id);
                });
            });
        })
        .catch(err => console.error(err));
}

function abrirModalEdicion(id) {
    // obtener datos del cliente y abrir modal con valores
    fetch(`http://127.0.0.1:5001/api/clientes`)
        .then(res => {
            if (!res.ok) throw new Error('Error al obtener clientes');
            return res.json();
        })
        .then(data => {
            const cliente = data.find(c => String(c.id) === String(id));
            if (!cliente) {
                alert('Cliente no encontrado');
                return;
            }
            clienteEditId = cliente.id;
            document.getElementById('editar-nombre').value = cliente.nombre || '';
            document.getElementById('editar-vehiculo').value = cliente.vehiculo || '';
            document.getElementById('editar-telefono').value = cliente.telefono || '';
            document.getElementById('editar-direccion').value = cliente.direccion || '';

            const modal = document.getElementById('modal-edicion');
            // usar flex para que se active el centrado por CSS
            modal.style.display = 'flex';
        })
        .catch(err => console.error(err));
}

// función global llamada desde el HTML onclick
function cerrarModal() {
    clienteEditId = null;
    const modal = document.getElementById('modal-edicion');
    modal.style.display = 'none';
}

function eliminarCliente(id) {
    fetch(`http://127.0.0.1:5001/api/clientes/${id}`, {
            method: 'DELETE'
        })
        .then(res => {
            if (!res.ok) throw new Error('Error al eliminar');
            cargarClientes();
        })
        .catch(err => console.error(err));
}

document.addEventListener('DOMContentLoaded', () => {
    // asegurar que el modal esté oculto inicialmente
    const modal = document.getElementById('modal-edicion');
    if (modal) modal.style.display = 'none';

    cargarClientes();

    // filtrar
    document.getElementById('btn-filtrar-clientes').addEventListener('click', () => {
        const filtro = document.getElementById('busqueda-clientes').value.toLowerCase();
        const filas = document.querySelectorAll('#tabla-clientes tbody tr');
        filas.forEach(fila => {
            const nombre = fila.children[0].textContent.toLowerCase();
            const vehiculo = fila.children[1].textContent.toLowerCase();
            fila.style.display = (nombre.includes(filtro) || vehiculo.includes(filtro)) ? '' : 'none';
        });
    });

    // agregar cliente
    document.getElementById('btn-agregar-cliente').addEventListener('click', () => {
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
                // limpiar campos y recargar tabla
                document.getElementById('nuevo-nombre').value = '';
                document.getElementById('nuevo-vehiculo').value = '';
                document.getElementById('nuevo-telefono').value = '';
                document.getElementById('nuevo-direccion').value = '';
                cargarClientes();
            })
            .catch(err => console.error(err));
    });

    // submit del formulario de edición
    const formEditar = document.getElementById('form-editar');
    formEditar.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!clienteEditId) return alert('ID de cliente no definido.');

        const nombre = document.getElementById('editar-nombre').value.trim();
        const vehiculo = document.getElementById('editar-vehiculo').value.trim();
        const telefono = document.getElementById('editar-telefono').value.trim();
        const direccion = document.getElementById('editar-direccion').value.trim();

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
            .catch(err => console.error(err));
    });

    // cerrar modal al hacer click fuera del contenido (opcional)
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('modal-edicion');
        if (e.target === modal) cerrarModal();
    });
});

// Exponer cerrarModal globalmente (para onclick en HTML)
window.cerrarModal = cerrarModal;