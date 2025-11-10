async function cargarMarcasBaterias() {
    try {
        const response = await fetch('http://localhost:5001/api/bateria/marcas');
        if (!response.ok) {
            throw new Error('Error al cargar las marcas');
        }

        const marcas = await response.json();
        const selectMarca = document.getElementById('marca-batería');

        selectMarca.innerHTML = '';

        const opcionDefault = document.createElement('option');
        opcionDefault.value = '';
        opcionDefault.textContent = 'Seleccione una marca';
        selectMarca.appendChild(opcionDefault);

        marcas.forEach(marca => {
            const opcion = document.createElement('option');
            opcion.value = marca;
            opcion.textContent = marca;
            selectMarca.appendChild(opcion);
        });

    } catch (error) {
        console.error('Error al cargar marcas:', error);
        const selectMarca = document.getElementById('marca-batería');
        selectMarca.innerHTML = '<option value="">Error al cargar marcas</option>';
    }
}

async function cargarModelosPorMarca(marca) {
    const selectModelo = document.getElementById('modelo-bateria');

    selectModelo.innerHTML = '<option value="">Cargando modelos...</option>';

    if (!marca) {
        selectModelo.innerHTML = '<option value="">Seleccione primero una marca</option>';
        selectModelo.disabled = true;
        return;
    }

    try {
        const response = await fetch(`http://localhost:5001/api/bateria/modelos?marca=${encodeURIComponent(marca)}`);
        if (!response.ok) {
            throw new Error('Error al cargar los modelos');
        }

        const modelos = await response.json();

        selectModelo.innerHTML = '';
        selectModelo.disabled = false;

        const opcionDefault = document.createElement('option');
        opcionDefault.value = '';
        opcionDefault.textContent = 'Seleccione un modelo';
        selectModelo.appendChild(opcionDefault);

        modelos.forEach(modelo => {
            const opcion = document.createElement('option');
            opcion.value = modelo.modelo;
            opcion.textContent = `${modelo.modelo} (Stock: ${modelo.stock})`;
            opcion.dataset.stock = modelo.stock;
            selectModelo.appendChild(opcion);
        });

    } catch (error) {
        console.error('Error al cargar modelos:', error);
        selectModelo.innerHTML = '<option value="">Error al cargar modelos</option>';
        selectModelo.disabled = true;
    }
}

async function registrarVenta(event) {
    event.preventDefault();

    const marca = document.getElementById('marca-batería').value;
    const modelo = document.getElementById('modelo-bateria').value;
    const cantidad = parseInt(document.getElementById('cantidad-bateria').value);
    const clienteSelect = document.getElementById('cliente-select');
    const idCliente = clienteSelect ? parseInt(clienteSelect.value || '') : null;

    if (!marca || !modelo || !cantidad) {
        alert('Por favor complete todos los campos requeridos (Marca, Modelo y Cantidad)');
        return;
    }

    if (cantidad <= 0) {
        alert('La cantidad debe ser mayor a 0');
        return;
    }

    const selectModelo = document.getElementById('modelo-bateria');
    const opcionSeleccionada = selectModelo.options[selectModelo.selectedIndex];
    const stockDisponible = parseInt(opcionSeleccionada.dataset.stock);

    if (stockDisponible < cantidad) {
        alert(`Stock insuficiente. Disponible: ${stockDisponible}, Solicitado: ${cantidad}`);
        return;
    }

    try {
        const response = await fetch('http://localhost:5001/api/ventas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                marca,
                modelo,
                cantidad,
                id_cliente: Number.isNaN(idCliente) ? null : idCliente
            })
        });

        const resultado = await response.json();

        if (!response.ok) {
            alert(`Error: ${resultado.error || 'Error al registrar la venta'}`);
            return;
        }

        alert(`Venta registrada exitosamente!\nID de venta: ${resultado.id_venta}\nTotal: $${Number(resultado.total).toFixed(2)}\nStock restante: ${resultado.stock_restante}`);

        document.getElementById('marca-batería').value = '';
        cargarModelosPorMarca('');
        document.getElementById('cantidad-bateria').value = '';
        if (document.getElementById('cliente-select')) {
            document.getElementById('cliente-select').value = '';
        }

        cargarMarcasBaterias();

    } catch (error) {
        console.error('Error al registrar venta:', error);
        alert('Error al conectar con el servidor. Por favor, intente nuevamente.');
    }
}

function descartarVenta() {
    if (confirm('¿Está seguro que desea descartar esta venta?')) {
        document.getElementById('marca-batería').value = '';
        cargarModelosPorMarca('');
        document.getElementById('cantidad-bateria').value = '';
        if (document.getElementById('cliente-select')) {
            document.getElementById('cliente-select').value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    cargarMarcasBaterias();
    cargarClientes();

    const selectMarca = document.getElementById('marca-batería');
    selectMarca.addEventListener('change', function() {
        cargarModelosPorMarca(this.value);
    });

    const formulario = document.querySelector('form');
    formulario.addEventListener('submit', registrarVenta);

    const btnDescartar = document.querySelector('input[value="Descartar"]');
    btnDescartar.addEventListener('click', descartarVenta);

    const inputBuscar = document.getElementById('cliente-buscar');
    if (inputBuscar) {
        inputBuscar.addEventListener('input', async() => {
            const term = inputBuscar.value.trim();
            await buscarClientes(term);
        });
    }
});
async function cargarClientes() {
    try {
        const res = await fetch('http://localhost:5001/api/clientes');
        if (!res.ok) throw new Error('Error al cargar clientes');
        const clientes = await res.json();

        const sel = document.getElementById('cliente-select');
        if (!sel) return;
        sel.innerHTML = '';

        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.textContent = 'Seleccione un cliente (opcional)';
        sel.appendChild(optDefault);

        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id_cliente;
            opt.textContent = `${c.nombre}${c.vehiculo ? ' - ' + c.vehiculo : ''}`;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error(e);
        const sel = document.getElementById('cliente-select');
        if (sel) sel.innerHTML = '<option value="">Error al cargar clientes</option>';
    }
}

async function buscarClientes(termino) {
    try {
        const base = 'http://localhost:5001/api/clientes';
        const url = termino ? `${base}?busqueda=${encodeURIComponent(termino)}` : base;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al buscar clientes');
        const clientes = await res.json();
        cargarCLientesSelect(clientes);

        if (termino && termino.trim() !== '' && Array.isArray(clientes) && clientes.length === 0) {
            const ir = confirm('No se encontraron clientes con ese criterio. ¿Desea registrar uno nuevo ahora?');
            if (ir) {
                window.location.href = 'clientes.html';
            }
        }
    } catch (e) {
        console.error(e);
    }
}

function cargarCLientesSelect(clientes) {
    const sel = document.getElementById('cliente-select');
    if (!sel) return;
    sel.innerHTML = '';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = 'Seleccione un cliente (opcional)';
    sel.appendChild(optDefault);
    clientes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id_cliente;
        opt.textContent = `${c.nombre}${c.vehiculo ? ' - ' + c.vehiculo : ''}${c.telefono ? ' (' + c.telefono + ')' : ''}`;
        sel.appendChild(opt);
    });
}