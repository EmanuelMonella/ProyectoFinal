// Debounce helper
function debounce(fn, delay) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

// Poblar select de proveedores
function poblarSelectProveedores(proveedores) {
    const sel = document.getElementById('proveedor-select');
    if (!sel) return;
    sel.innerHTML = '';
    const optDefault = document.createElement('option');
    optDefault.value = '';
    optDefault.textContent = 'Seleccione un proveedor (opcional)';
    sel.appendChild(optDefault);
    proveedores.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id_proveedor;
        opt.textContent = `${p.nombre}${p.cuit ? ' - ' + p.cuit : ''}${p.telefono ? ' (' + p.telefono + ')' : ''}`;
        sel.appendChild(opt);
    });
}

async function cargarProveedoresInicial() {
    try {
        const res = await fetch('http://localhost:5001/api/proveedor');
        if (!res.ok) throw new Error('Error al cargar proveedores');
        const proveedores = await res.json();
        poblarSelectProveedores(proveedores);
    } catch (e) {
        console.error(e);
        const sel = document.getElementById('proveedor-select');
        if (sel) sel.innerHTML = '<option value="">Error al cargar proveedores</option>';
    }
}

async function buscarYRenderizarProveedores(termino) {
    try {
        const base = 'http://localhost:5001/api/proveedor';
        const url = termino ? `${base}?busqueda=${encodeURIComponent(termino)}` : base;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al buscar proveedores');
        const proveedores = await res.json();
        poblarSelectProveedores(proveedores);
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    cargarProveedoresInicial();

    // Cargar marcas de baterías y configurar dependencias de modelo
    cargarMarcasBaterias();
    const selectMarca = document.getElementById('marca-batería');
    if (selectMarca) {
        selectMarca.addEventListener('change', function() {
            cargarModelosPorMarca(this.value);
        });
    }

    // Manejar submit de compra
    const formulario = document.querySelector('form');
    if (formulario) {
        formulario.addEventListener('submit', registrarCompra);
    }

    // Botón descartar
    const btnDescartar = document.querySelector('input[value="Descartar"]');
    if (btnDescartar) {
        btnDescartar.addEventListener('click', descartarCompra);
    }
    const inputBuscar = document.getElementById('proveedor-buscar');
    if (inputBuscar) {
        const debounced = debounce(async () => {
            const term = inputBuscar.value.trim();
            await buscarYRenderizarProveedores(term);
        }, 300);
        inputBuscar.addEventListener('input', debounced);
    }
});


// Cargar marcas (igual que en ventas)
async function cargarMarcasBaterias() {
    try {
        const response = await fetch('http://localhost:5001/api/bateria/marcas');
        if (!response.ok) throw new Error('Error al cargar las marcas');
        const marcas = await response.json();
        const selectMarca = document.getElementById('marca-batería');
        if (!selectMarca) return;
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
        if (selectMarca) selectMarca.innerHTML = '<option value="">Error al cargar marcas</option>';
    }
}

// Cargar modelos según marca
async function cargarModelosPorMarca(marca) {
    const selectModelo = document.getElementById('modelo-bateria');
    if (!selectModelo) return;
    selectModelo.innerHTML = '<option value="">Cargando modelos...</option>';
    if (!marca) {
        selectModelo.innerHTML = '<option value="">Seleccione primero una marca</option>';
        selectModelo.disabled = true;
        return;
    }
    try {
        const response = await fetch(`http://localhost:5001/api/bateria/modelos?marca=${encodeURIComponent(marca)}`);
        if (!response.ok) throw new Error('Error al cargar los modelos');
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
            opcion.textContent = `${modelo.modelo}${typeof modelo.stock !== 'undefined' ? ' (Stock: ' + modelo.stock + ')' : ''}`;
            selectModelo.appendChild(opcion);
        });
    } catch (error) {
        console.error('Error al cargar modelos:', error);
        selectModelo.innerHTML = '<option value="">Error al cargar modelos</option>';
        selectModelo.disabled = true;
    }
}

// Registrar compra
async function registrarCompra(event) {
    event.preventDefault();
    const marca = document.getElementById('marca-batería')?.value;
    const modelo = document.getElementById('modelo-bateria')?.value;
    const cantidad = parseInt(document.getElementById('cantidad-bateria')?.value || '');
    const proveedorSel = document.getElementById('proveedor-select');
    const id_proveedor = proveedorSel ? parseInt(proveedorSel.value || '') : null;
    const comentario = document.getElementById('comentario')?.value || null;

    if (!marca || !modelo || !cantidad || Number.isNaN(cantidad) || cantidad < 1) {
        alert('Complete Marca, Modelo y una Cantidad válida (>0)');
        return;
    }

    try {
        const res = await fetch('http://localhost:5001/api/compras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                marca,
                modelo,
                cantidad,
                id_proveedor: Number.isNaN(id_proveedor) ? null : id_proveedor,
                comentario
            })
        });
        const data = await res.json();
        if (!res.ok) {
            alert(`Error: ${data.error || 'No se pudo registrar la compra'}`);
            return;
        }
        alert(`Compra registrada!\nID: ${data.id_compra}\nStock nuevo: ${data.stock_nuevo}`);
        limpiarFormularioCompra();
    } catch (e) {
        console.error(e);
        alert('Error de conexión con el servidor');
    }
}

function limpiarFormularioCompra() {
    const marca = document.getElementById('marca-batería');
    if (marca) marca.value = '';
    cargarModelosPorMarca('');
    const cantidad = document.getElementById('cantidad-bateria');
    if (cantidad) cantidad.value = '';
    const selProv = document.getElementById('proveedor-select');
    if (selProv) selProv.value = '';
    const com = document.getElementById('comentario');
    if (com) com.value = '';
}

function descartarCompra() {
    if (confirm('¿Descartar compra?')) {
        limpiarFormularioCompra();
    }
}

