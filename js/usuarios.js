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