function cargarClientes() {
    fetch('http://127.0.0.1:5001/api/clientes')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-clientes tbody');
            tbody.innerHTML = '';
            data.forEach(cliente => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${cliente.nombre}</td>
                    <td>${cliente.vehiculo || ''}</td>
                    <td>${cliente.telefono}</td>
                    <td>${cliente.direccion || ''}</td>
                    <td>
                        <button class="btn-editar" data-id="${cliente.id}">Editar</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });

            document.querySelectorAll('.btn-editar').forEach(btn => {
                btn.addEventListener('click', function() {
                    mostrarModalEdicion(this.dataset.id);
                });
            });
        })
        .catch(error => {
            console.error('Error al obtener clientes:', error);
        });
}

function actualizarCliente(id, datos) {
    fetch(`http://127.0.0.1:5001/api/clientes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        })
        .then(response => response.json())
        .then(data => {
            cargarClientes();
            cerrarModal();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

document.addEventListener('DOMContentLoaded', cargarClientes);

document.getElementById('btn-filtrar-clientes').addEventListener('click', function() {
    const filtro = document.getElementById('busqueda-clientes').value.toLowerCase();
    const filas = document.querySelectorAll('#tabla-clientes tbody tr');
    filas.forEach(fila => {
        const nombre = fila.children[0].textContent.toLowerCase();
        const vehiculo = fila.children[1].textContent.toLowerCase();
        const telefono = fila.children[2].textContent.toLowerCase();
        const coincide = nombre.includes(filtro) || vehiculo.includes(filtro) || telefono.includes(filtro);
        fila.style.display = coincide ? '' : 'none';
    });
});

document.getElementById('btn-agregar-cliente').addEventListener('click', function() {
    const nuevoNombre = document.getElementById('nuevo-nombre').value;
    const nuevoTelefono = document.getElementById('nuevo-telefono').value;
    const nuevoVehiculo = document.getElementById('nuevo-vehiculo').value;
    const nuevaDireccion = document.getElementById('nueva-direccion').value;

    if (!nuevoNombre || !nuevoTelefono) {
        alert('Nombre y teléfono son requeridos');
        return;
    }

    const nuevoCliente = {
        nombre: nuevoNombre,
        telefono: nuevoTelefono,
        vehiculo: nuevoVehiculo,
        direccion: nuevaDireccion
    };

    fetch('http://127.0.0.1:5001/api/clientes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevoCliente)
        })
        .then(response => response.json())
        .then(data => {
            cargarClientes();
        })
        .catch(error => {
            console.error('Error:', error);
        });
});

// Función para mostrar modal de edición
function mostrarModalEdicion(id) {
    fetch(`http://127.0.0.1:5001/api/clientes/${id}`)
        .then(response => response.json())
        .then(cliente => {
            document.getElementById('editar-nombre').value = cliente.nombre;
            document.getElementById('editar-telefono').value = cliente.telefono;
            document.getElementById('editar-vehiculo').value = cliente.vehiculo || '';
            document.getElementById('editar-direccion').value = cliente.direccion || '';
            document.getElementById('modal-edicion').style.display = 'block';
            document.getElementById('form-editar').dataset.id = id;
        });
}

document.getElementById('form-editar').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = this.dataset.id;
    const datosActualizados = {
        nombre: document.getElementById('editar-nombre').value,
        telefono: document.getElementById('editar-telefono').value,
        vehiculo: document.getElementById('editar-vehiculo').value,
        direccion: document.getElementById('editar-direccion').value
    };
    actualizarCliente(id, datosActualizados);
});

function cerrarModal() {
    document.getElementById('modal-edicion').style.display = 'none';
}