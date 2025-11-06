function validarDatos(marca, modelo, stock, precio_compra, precio_venta) {
    if (!marca || !modelo || isNaN(stock) || precio_compra === undefined || precio_venta === undefined) {
        alert('Todos los campos son requeridos (incluye precios)');
        return false;
    }
    if (!Number.isInteger(stock) || stock < 0) {
        alert('El stock debe ser un entero mayor o igual a 0');
        return false;
    }
    if (isNaN(precio_compra) || isNaN(precio_venta) || precio_compra < 0 || precio_venta < 0) {
        alert('Los precios deben ser números mayores o iguales a 0');
        return false;
    }
    return true;
}

function validarPrecios(precio_compra, precio_venta) {
    if (isNaN(precio_compra) || isNaN(precio_venta)) {
        alert('Los precios deben ser numéricos');
        return false;
    }
    if (precio_compra < 0 || precio_venta < 0) {
        alert('Los precios deben ser mayores o iguales a 0');
        return false;
    }
    return true;
}

function validarStock(stock) {
    if (isNaN(stock) || stock < 1 || !Number.isInteger(stock)) {
        alert('Stock inválido (mínimo 1 y entero)');
        return false;
    }
    return true;
}

function limpiarFormulario() {
    const nm = document.getElementById('nuevo-marca');
    const nmo = document.getElementById('nuevo-modelo');
    const ns = document.getElementById('nuevo-stock');
    if (nm) nm.value = '';
    if (nmo) nmo.value = '';
    if (ns) ns.value = '';
    const pc = document.getElementById('nuevo-precio-compra');
    const pv = document.getElementById('nuevo-precio-venta');
    if (pc) pc.value = '';
    if (pv) pv.value = '';
}

async function cargarBaterias(filtro = '') {
    try {
        const response = await fetch(`http://localhost:5001/api/bateria?marca=${encodeURIComponent(filtro)}`);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        const data = await response.json();
        actualizarTabla(data);
    } catch (error) {
        alert(error.message || 'Error al cargar baterías');
    }
}

function actualizarTabla(baterias) {
    const tbody = document.querySelector('#tabla-baterias tbody');
    if (!tbody) return;
    
    tbody.innerHTML = baterias.map(bateria => {
        const id = bateria.id ? bateria.id : bateria.id_bateria ? bateria.id_bateria : '';
        const stock = bateria.stock ? bateria.stock : bateria.cantidad ? bateria.cantidad : 0;
        return `
      <tr>
        <td>${bateria.marca || ''}</td>
        <td>${bateria.modelo || ''}</td>
        <td>
          <input type="number" min="0" step="0.01" class="input-precio-compra" value="${Number(bateria.precio_compra ?? 0)}">
        </td>
        <td>
          <input type="number" min="0" step="0.01" class="input-precio-venta" value="${Number(bateria.precio_venta ?? 0)}">
        </td>
        <td class="col-stock">${stock}</td>
        <td>
          <input type="number" min="1" value="1" class="input-stock" data-id="${id}">
          <button class="btn-disminuir" data-id="${id}">Disminuir</button>
          <button class="btn-sumar" data-id="${id}">Sumar</button>
          <button class="btn-guardar-precios" data-id="${id}">Guardar precios</button>
        </td>
      </tr>
    `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const btnFiltrar = document.getElementById('btn-filtrar');
    const btnAgregar = document.getElementById('btn-agregar');
    const tbody = document.querySelector('#tabla-baterias tbody');

    if (!tbody) {
        console.warn('No se encontró #tabla-baterias tbody en el DOM');
        return;
    }

    cargarBaterias();

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', () => {
            const filtro = document.getElementById('busqueda-nombre')?.value || '';
            cargarBaterias(filtro);
        });
    }

    if (btnAgregar) {
        btnAgregar.addEventListener('click', async() => {
            const marca = document.getElementById('nuevo-marca')?.value.trim() || '';
            const modelo = document.getElementById('nuevo-modelo')?.value.trim() || '';
            const stockRaw = document.getElementById('nuevo-stock')?.value || '';
            const precioCompraRaw = document.getElementById('nuevo-precio-compra')?.value;
            const precioVentaRaw = document.getElementById('nuevo-precio-venta')?.value;
            const stock = parseInt(stockRaw, 10);
            const precio_compra = precioCompraRaw !== undefined ? parseFloat(precioCompraRaw) : undefined;
            const precio_venta = precioVentaRaw !== undefined ? parseFloat(precioVentaRaw) : undefined;

            if (!validarDatos(marca, modelo, stock, precio_compra, precio_venta)) return;

            try {
                const response = await fetch('http://localhost:5001/api/bateria', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        marca: marca,
                        modelo: modelo,
                        stock: stock,
                        precio_compra: precio_compra,
                        precio_venta: precio_venta
                    })
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.error || `Error al agregar (status ${response.status})`);
                }

                limpiarFormulario();
                await cargarBaterias();
                alert('Batería agregada correctamente');
            } catch (error) {
                alert(error.message || 'Error al agregar batería');
            }
        });
    }

    tbody.addEventListener('click', async(e) => {
        const target = e.target;
        
        if (target.classList.contains('btn-sumar') || target.classList.contains('btn-disminuir')) {
            const tr = target.closest('tr');
            if (!tr) return;

            const input = tr.querySelector('.input-stock');
            if (!input) {
                alert('No se encontró el campo de cantidad');
                return;
            }

            const cantidad = parseInt(input.value, 10);
            const id = target.dataset.id;
            const operacion = target.classList.contains('btn-sumar') ? 'sumar' : 'disminuir';

            if (!validarStock(cantidad)) return;

            try {
                const response = await fetch(`http://localhost:5001/api/bateria/${id}/${operacion}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cantidad: cantidad })
                });

                const resultado = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(resultado.error || `Error en la operación (status ${response.status})`);
                }

                await cargarBaterias();
                alert(`Stock ${operacion === 'sumar' ? 'aumentado' : 'disminuido'} correctamente`);
            } catch (error) {
                alert(error.message || 'Error al actualizar stock');
            }
        }

        if (target.classList.contains('btn-guardar-precios')) {
            const tr = target.closest('tr');
            if (!tr) return;
            const id = target.dataset.id;
            const inputPc = tr.querySelector('.input-precio-compra');
            const inputPv = tr.querySelector('.input-precio-venta');
            if (!inputPc || !inputPv) {
                alert('No se encontraron los campos de precios');
                return;
            }
            const pc = parseFloat(inputPc.value);
            const pv = parseFloat(inputPv.value);
            if (!validarPrecios(pc, pv)) return;
            try {
                const res = await fetch(`http://localhost:5001/api/bateria/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ precio_compra: pc, precio_venta: pv })
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'No se pudieron actualizar los precios');
                await cargarBaterias();
                alert('Precios actualizados');
            } catch (err) {
                alert(err.message || 'Error al actualizar precios');
            }
        }
    });
});