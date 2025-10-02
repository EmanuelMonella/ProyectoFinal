document.addEventListener('DOMContentLoaded', () => {
    fetch('http://127.0.0.1:5000/api/usuarios')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-usuarios tbody');
            tbody.innerHTML = '';

            data.forEach(usuario => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${usuario.id}</td>
                    <td>${usuario.nombre}</td>
                    <td>${usuario.email}</td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error al obtener usuarios:', error);
        });
});

document.getElementById('btn-filtrar').addEventListener('click', function() {
    const filtro = document.getElementById('busqueda-nombre').value.toLowerCase();
    const filas = document.querySelectorAll('#tabla-usuarios tbody tr');
    filas.forEach(fila => {
        const nombre = fila.children[1].textContent.toLowerCase();
        fila.style.display = nombre.includes(filtro) ? '' : 'none';
    });
});