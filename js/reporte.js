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

// Renderiza una tabla con los datos
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
                <td>${item.fecha || ''}</td>
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

// Obtiene los valores de los filtros del formulario
function obtenerFiltros() {
    return {
        fecha_desde: document.getElementById('fecha-desde').value.trim(),
        fecha_hasta: document.getElementById('fecha-hasta').value.trim(),
        marca: document.getElementById('filtro-marca').value.trim(),
        modelo: document.getElementById('filtro-modelo').value.trim()
    };
}

// Carga y muestra los reportes según los filtros
async function cargarReportes() {
    const tipoSeleccionado = document.getElementById('tipo').value;
    const filtros = obtenerFiltros();
    
    try {
        // Determinar qué datos cargar
        const cargarVentas = tipoSeleccionado === 'ventas' || tipoSeleccionado === 'todos';
        const cargarCompras = tipoSeleccionado === 'compras' || tipoSeleccionado === 'todos';
        
        // Cargar datos en paralelo (solo los necesarios)
        const promesas = {
            ventas: cargarVentas ? obtenerDatos('ventas', filtros) : Promise.resolve([]),
            compras: cargarCompras ? obtenerDatos('compras', filtros) : Promise.resolve([])
        };
        
        const [ventas, compras] = await Promise.all([
            promesas.ventas,
            promesas.compras
        ]);
        
        // Renderizar tablas
        renderizarTabla('#tabla-ventas', ventas, 'cliente');
        renderizarTabla('#tabla-compras', compras, 'proveedor');
        
    } catch (error) {
        alert(error.message || 'Error al cargar los reportes');
        console.error('Error:', error);
    }
}

// Limpia todos los filtros y recarga los reportes
function limpiarFiltros() {
    document.getElementById('tipo').value = 'todos';
    document.getElementById('fecha-desde').value = '';
    document.getElementById('fecha-hasta').value = '';
    document.getElementById('filtro-marca').value = '';
    document.getElementById('filtro-modelo').value = '';
}

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Botón filtrar
    document.getElementById('btn-filtrar').addEventListener('click', cargarReportes);
    
    // Botón limpiar
    document.getElementById('btn-limpiar').addEventListener('click', () => {
        limpiarFiltros();
        cargarReportes();
    });
    
    // Cargar reportes al inicio
    cargarReportes();
});
