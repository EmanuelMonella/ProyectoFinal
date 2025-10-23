document.addEventListener('DOMContentLoaded', () => {
    const btnFiltrar = document.getElementById('btn-filtrar');
    const btnAgregar = document.getElementById('btn-agregar');
    const tbody = document.querySelector('#tabla-baterias tbody');

    // Cargar datos iniciales
    cargarBaterias();

    // Evento para filtrar
    btnFiltrar.addEventListener('click', () => {
        const filtro = document.getElementById('busqueda-nombre').value;
        cargarBaterias(filtro);
    });

    // Evento para agregar nueva batería
    btnAgregar.addEventListener('click', async() => {
        const marca = document.getElementById('nuevo-marca').value.trim();
        const modelo = document.getElementById('nuevo-modelo').value.trim();
        const stockRaw = document.getElementById('nuevo-stock').value;
        const stock = parseInt(stockRaw, 10);

        if (!validarDatos(marca, modelo, stock)) return;

        try {
            const response = await fetch('http://127.0.0.1:5001/api/bateria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    marca: marca,
                    modelo: modelo,
                    stock: stock
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error al agregar (status ${response.status})`);
            }

            limpiarFormulario();
            await cargarBaterias();
            mostrarMensaje('success', 'Batería agregada correctamente');
        } catch (error) {
            mostrarMensaje('error', error.message);
        }
    });

    // Delegación de eventos: registrar una vez en tbody
    tbody.addEventListener('click', async(e) => {
        const target = e.target;
        if (target.classList.contains('btn-sumar') || target.classList.contains('btn-disminuir')) {
            // Buscar la fila que contiene el botón
            const tr = target.closest('tr');
            if (!tr) return;

            // Obtener el input dentro de la misma fila
            const input = tr.querySelector('.input-stock');
            if (!input) {
                mostrarMensaje('error', 'No se encontró el campo de cantidad');
                return;
            }

            const stock = parseInt(input.value, 10);
            const id = target.dataset.id;
            const operacion = target.classList.contains('btn-sumar') ? 'sumar' : 'disminuir';

            if (!validarStock(stock)) return;

            try {
                const response = await fetch(`http://127.0.0.1:5001/api/bateria/${id}/${operacion}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ stock: stock })
                });

                const resultado = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(resultado.error || `Error en la operación (status ${response.status})`);
                }

                await cargarBaterias();
                mostrarMensaje('success', `Stock ${operacion === 'sumar' ? 'aumentado' : 'disminuido'} correctamente`);
            } catch (error) {
                mostrarMensaje('error', error.message);
            }
        }
    });

    // Función principal para cargar datos
    async function cargarBaterias(filtro = '') {
        try {
            const response = await fetch(`http://127.0.0.1:5001/api/bateria?marca=${encodeURIComponent(filtro)}`);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            const data = await response.json();
            actualizarTabla(data);
        } catch (error) {
            mostrarMensaje('error', error.message);
        }
    }

    // Actualizar tabla con datos
    function actualizarTabla(baterias) {
        tbody.innerHTML = baterias.map(bateria => `
      <tr>
        <td>${escapeHtml(bateria.marca)}</td>
        <td>${escapeHtml(bateria.modelo)}</td>
        <td>${bateria.stock}</td>
        <td>
          <input type="number" min="1" value="1" class="input-stock" data-id="${bateria.id}">
          <button class="btn-disminuir" data-id="${bateria.id}">Disminuir</button>
          <button class="btn-sumar" data-id="${bateria.id}">Sumar</button>
        </td>
      </tr>
    `).join('');
    }

    // Funciones auxiliares
    function validarDatos(marca, modelo, stock) {
        if (!marca || !modelo || isNaN(stock)) {
            mostrarMensaje('error', 'Todos los campos son requeridos y stock debe ser numérico');
            return false;
        }
        if (!Number.isInteger(stock) || stock < 0) {
            mostrarMensaje('error', 'El stock debe ser un entero mayor o igual a 0');
            return false;
        }
        return true;
    }

    function validarStock(stock) {
        if (isNaN(stock) || stock < 1 || !Number.isInteger(stock)) {
            mostrarMensaje('error', 'Stock inválido (mínimo 1 y entero)');
            return false;
        }
        return true;
    }

    function limpiarFormulario() {
        document.getElementById('nuevo-marca').value = '';
        document.getElementById('nuevo-modelo').value = '';
        document.getElementById('nuevo-stock').value = '';
    }

    function escapeHtml(unsafe) {
        return unsafe ? unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;") : '';
    }

    function mostrarMensaje(tipo, mensaje) {
        const contenedor = document.createElement('div');
        contenedor.className = `mensaje-${tipo}`;
        contenedor.textContent = mensaje;

        document.body.appendChild(contenedor);

        setTimeout(() => {
            contenedor.remove();
        }, 5000);
    }
});