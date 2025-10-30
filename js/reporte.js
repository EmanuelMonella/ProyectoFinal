function construirQuery(params) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
            query.append(k, v);
        }
    });
    const qs = query.toString();
    return qs ? `?${qs}` : '';
}

async function fetchVentas(filtros) {
    const url = `http://localhost:5001/api/ventas${construirQuery(filtros)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudieron cargar las ventas');
    return res.json();
}

async function fetchCompras(filtros) {
    const url = `http://localhost:5001/api/compras${construirQuery(filtros)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudieron cargar las compras');
    return res.json();
}

function formatoMoneda(valor) {
    const num = Number(valor || 0);
    return num.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
}

function renderVentas(filas) {
    const tbody = document.querySelector('#tabla-ventas tbody');
    tbody.innerHTML = '';
    filas.forEach(v => {
        const tr = document.createElement('tr');
        const totalFila = Number(v.cantidad) * Number(v.precio_unitario);
        tr.innerHTML = `
            <td>${v.fecha ?? ''}</td>
            <td>${v.cliente ?? ''}</td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.cantidad}</td>
            <td>${formatoMoneda(v.precio_unitario)}</td>
            <td>${formatoMoneda(totalFila)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderCompras(filas) {
    const tbody = document.querySelector('#tabla-compras tbody');
    tbody.innerHTML = '';
    filas.forEach(c => {
        const tr = document.createElement('tr');
        const totalFila = Number(c.cantidad) * Number(c.precio_unitario);
        tr.innerHTML = `
            <td>${c.fecha ?? ''}</td>
            <td>${c.proveedor ?? ''}</td>
            <td>${c.marca}</td>
            <td>${c.modelo}</td>
            <td>${c.cantidad}</td>
            <td>${formatoMoneda(c.precio_unitario)}</td>
            <td>${formatoMoneda(totalFila)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function cargarReportes() {
    const tipo = document.getElementById('tipo').value;
    const filtrosBase = {
        fecha_desde: document.getElementById('fecha-desde').value,
        fecha_hasta: document.getElementById('fecha-hasta').value,
        marca: document.getElementById('filtro-marca').value,
        modelo: document.getElementById('filtro-modelo').value
    };

    try {
        if (tipo === 'ventas' || tipo === 'todos') {
            const ventas = await fetchVentas(filtrosBase);
            renderVentas(ventas);
        } else {
            renderVentas([]);
        }

        if (tipo === 'compras' || tipo === 'todos') {
            const compras = await fetchCompras(filtrosBase);
            renderCompras(compras);
        } else {
            renderCompras([]);
        }
    } catch (e) {
        alert(e.message || 'Error al cargar reportes');
    }
}

function limpiarFiltros() {
    document.getElementById('tipo').value = 'todos';
    document.getElementById('fecha-desde').value = '';
    document.getElementById('fecha-hasta').value = '';
    document.getElementById('filtro-marca').value = '';
    document.getElementById('filtro-modelo').value = '';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-filtrar').addEventListener('click', cargarReportes);
    document.getElementById('btn-limpiar').addEventListener('click', () => {
        limpiarFiltros();
        cargarReportes();
    });
    cargarReportes();
});


