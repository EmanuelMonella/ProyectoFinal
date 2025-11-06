const construirQuery = (params) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v?.toString().trim()) query.append(k, v);
    });
    const qs = query.toString();
    return qs ? `?${qs}` : '';
};

const fetchDatos = async (tipo, filtros) => {
    const url = `http://localhost:5001/api/${tipo}${construirQuery(filtros)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`No se pudieron cargar las ${tipo}`);
    return res.json();
};

const formatoMoneda = (valor) => 
    Number(valor || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });

const renderTabla = (selector, filas, campoEntidad) => {
    const tbody = document.querySelector(`${selector} tbody`);
    tbody.innerHTML = filas.map(item => {
        const total = Number(item.cantidad) * Number(item.precio_unitario);
        return `
            <tr>
                <td>${item.fecha ?? ''}</td>
                <td>${item[campoEntidad] ?? ''}</td>
                <td>${item.marca}</td>
                <td>${item.modelo}</td>
                <td>${item.cantidad}</td>
                <td>${formatoMoneda(item.precio_unitario)}</td>
                <td>${formatoMoneda(total)}</td>
            </tr>
        `;
    }).join('');
};

const obtenerFiltros = () => ({
    fecha_desde: document.getElementById('fecha-desde').value,
    fecha_hasta: document.getElementById('fecha-hasta').value,
    marca: document.getElementById('filtro-marca').value,
    modelo: document.getElementById('filtro-modelo').value
});

async function cargarReportes() {
    const tipo = document.getElementById('tipo').value;
    const filtros = obtenerFiltros();

    try {
        const debeCargarVentas = tipo === 'ventas' || tipo === 'todos';
        const debeCargarCompras = tipo === 'compras' || tipo === 'todos';

        const [ventas, compras] = await Promise.all([
            debeCargarVentas ? fetchDatos('ventas', filtros) : Promise.resolve([]),
            debeCargarCompras ? fetchDatos('compras', filtros) : Promise.resolve([])
        ]);

        renderTabla('#tabla-ventas', ventas, 'cliente');
        renderTabla('#tabla-compras', compras, 'proveedor');
    } catch (e) {
        alert(e.message || 'Error al cargar reportes');
    }
}

const limpiarFiltros = () => {
    document.getElementById('tipo').value = 'todos';
    ['fecha-desde', 'fecha-hasta', 'filtro-marca', 'filtro-modelo'].forEach(id => {
        document.getElementById(id).value = '';
    });
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-filtrar').addEventListener('click', cargarReportes);
    document.getElementById('btn-limpiar').addEventListener('click', () => {
        limpiarFiltros();
        cargarReportes();
    });
    cargarReportes();
});


