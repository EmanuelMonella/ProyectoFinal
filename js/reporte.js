function construirQuery(params) {
    const query = new URLSearchParams();
    for (const [clave, valor] of Object.entries(params)) {
        if (valor?.toString().trim()) {
            query.append(clave, valor);
        }
    }
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
}

async function obtenerDatos(tipo, filtros) {
    const url = `http://localhost:5001/api/${tipo}${construirQuery(filtros)}`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) {
        throw new Error(`Error al cargar ${tipo}`);
    }
    return respuesta.json();
}

function formatoMoneda(valor) {
    const numero = Number(valor || 0);
    return numero.toLocaleString('es-AR', { 
        style: 'currency', 
        currency: 'ARS' 
    });
}

function formatoFecha(fecha) {
    if (!fecha) return '';
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) {
        const partes = fecha.toString().split(/[-/]/);
        if (partes.length === 3) {
            if (partes[0].length === 4) {
                return `${partes[2]}/${partes[1]}/${partes[0]}`;
            }
            return fecha;
        }
        return fecha;
    }
    
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const año = fechaObj.getFullYear();
    
    return `${dia}/${mes}/${año}`;
}

function renderizarTabla(selectorTabla, datos, nombreCampo) {
    const tbody = document.querySelector(`${selectorTabla} tbody`);
    
    if (!datos || datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7">No hay datos para mostrar</td></tr>';
        return;
    }
    
    tbody.innerHTML = datos.map(item => {
        const cantidad = Number(item.cantidad || 0);
        const precioUnitario = Number(item.precio_unitario || 0);
        const total = cantidad * precioUnitario;
        
        return `
            <tr>
                <td>${formatoFecha(item.fecha)}</td>
                <td>${item[nombreCampo] || ''}</td>
                <td>${item.marca || ''}</td>
                <td>${item.modelo || ''}</td>
                <td>${cantidad}</td>
                <td>${formatoMoneda(precioUnitario)}</td>
                <td>${formatoMoneda(total)}</td>
            </tr>
        `;
    }).join('');
}

function obtenerFiltros() {
    return {
        fecha_desde: document.getElementById('fecha-desde').value.trim(),
        fecha_hasta: document.getElementById('fecha-hasta').value.trim(),
        marca: document.getElementById('filtro-marca').value.trim(),
        modelo: document.getElementById('filtro-modelo').value.trim()
    };
}

async function cargarReportes() {
    const tipoSeleccionado = document.getElementById('tipo').value;
    const filtros = obtenerFiltros();
    
    try {
        const cargarVentas = tipoSeleccionado === 'ventas' || tipoSeleccionado === 'todos';
        const cargarCompras = tipoSeleccionado === 'compras' || tipoSeleccionado === 'todos';
        const promesas = {
            ventas: cargarVentas ? obtenerDatos('ventas', filtros) : Promise.resolve([]),
            compras: cargarCompras ? obtenerDatos('compras', filtros) : Promise.resolve([])
        };
        
        const [ventas, compras] = await Promise.all([
            promesas.ventas,
            promesas.compras
        ]);
        
        renderizarTabla('#tabla-ventas', ventas, 'cliente');
        renderizarTabla('#tabla-compras', compras, 'proveedor');
        
    } catch (error) {
        alert(error.message || 'Error al cargar los reportes');
        console.error('Error:', error);
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
