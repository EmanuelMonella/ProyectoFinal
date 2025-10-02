document.addEventListener('DOMContentLoaded', () => {
    fetch('http://127.0.0.1:5001/api/bateria')
        .then(response => {
            if (!response.ok) {
                throw new Error('Respuesta no válida del servidor');
            }
            return response.json();
        })
        .then(data => {
            const tbody = document.querySelector('#tabla-baterias tbody');
            tbody.innerHTML = '';

            data.forEach(bateria => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${bateria.marca}</td>
                    <td>${bateria.modelo}</td>
                    <td>${bateria.stock}</td>
                `;
                tbody.appendChild(fila);
            });
        })
        .catch(error => {
            console.error('Error al obtener baterías:', error);
        });
});

document.getElementById('btn-filtrar').addEventListener('click', function() {
    const filtro = document.getElementById('busqueda-nombre').value.toLowerCase();
    const filas = document.querySelectorAll('#tabla-baterias tbody tr');
    filas.forEach(fila => {
        const marca = fila.children[0].textContent.toLowerCase();
        fila.style.display = marca.includes(filtro) ? '' : 'none';
    });
});