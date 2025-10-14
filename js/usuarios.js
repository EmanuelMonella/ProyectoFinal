function cargarBaterias() {
    fetch('http://127.0.0.1:5001/api/bateria')
        .then(response => response.json())
        .then(data => {
            const tbody = document.querySelector('#tabla-baterias tbody');
            tbody.innerHTML = '';
            data.forEach(bateria => {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td>${bateria.marca}</td>
                    <td>${bateria.modelo}</td>
                    <td>${bateria.stock}</td>
                    <td>
                        <input type="number" min="1" value="1" class="input-cantidad" style="width:50px;">
                        <button class="btn-disminuir" data-id="${bateria.id}">Disminuir</button>
                        <button class="btn-sumar" data-id="${bateria.id}">Sumar</button>
                    </td>
                `;
                tbody.appendChild(fila);
            });
            document.querySelectorAll('.btn-disminuir').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cantidad = this.previousElementSibling.value;
                    disminuirStock(this.dataset.id, cantidad);
                });
            });
            document.querySelectorAll('.btn-sumar').forEach(btn => {
                btn.addEventListener('click', function() {
                    const cantidad = this.parentElement.querySelector('.input-cantidad').value;
                    sumarStock(this.dataset.id, cantidad);
                });
            });
        })
        .catch(error => {
            console.error('Error al obtener baterías:', error);
        });
}

function disminuirStock(id, cantidad) {
    fetch(`http://127.0.0.1:5001/api/bateria/${id}/disminuir`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad: parseInt(cantidad, 10) })
        })
        .then(response => response.json())
        .then(data => {
            cargarBaterias();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function sumarStock(id, cantidad) {
    fetch(`http://127.0.0.1:5001/api/bateria/${id}/sumar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cantidad: parseInt(cantidad, 10) })
        })
        .then(response => response.json())
        .then(data => {
            cargarBaterias();
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

document.addEventListener('DOMContentLoaded', cargarBaterias);

document.getElementById('btn-filtrar').addEventListener('click', function() {
    const filtro = document.getElementById('busqueda-nombre').value.toLowerCase();
    const filas = document.querySelectorAll('#tabla-baterias tbody tr');
    filas.forEach(fila => {
        const marca = fila.children[0].textContent.toLowerCase();
        fila.style.display = marca.includes(filtro) ? '' : 'none';
    });
});

document.getElementById('btn-agregar').addEventListener('click', function() {
    const nuevaMarca = document.getElementById('nuevo-marca').value;
    const nuevoModelo = document.getElementById('nuevo-modelo').value;
    const nuevoStock = parseInt(document.getElementById('nuevo-stock').value, 10);

    if (!nuevaMarca || !nuevoModelo || isNaN(nuevoStock) || nuevoStock < 0) {
        alert('Por favor, complete todos los campos correctamente.');
        return;
    }

    const nuevaBateria = {
        marca: nuevaMarca,
        modelo: nuevoModelo,
        stock: nuevoStock
    };

    fetch('http://127.0.0.1:5001/api/bateria', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaBateria)
        })
        .then(response => response.json())
        .then(data => {
            cargarBaterias();
        })
        .catch(error => {
            console.error('Error:', error);
        });
});