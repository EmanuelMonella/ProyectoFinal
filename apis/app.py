from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)

def obtener_conexion():
    """Obtiene una conexión a la base de datos MySQL."""
    return pymysql.connect(
        host='localhost',
        user='ema',
        password='12345',
        database='baterias_badia',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

# ===========================
# ENDPOINTS PARA BATERIAS
# ===========================
@app.route('/api/bateria', methods=['GET'])
def obtener_baterias():
    marca = request.args.get('marca')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = (
                "SELECT id_bateria as id, marca, modelo, stock, precio_compra, precio_venta FROM bateria"
                + (" WHERE marca LIKE %s" if marca else "")
            )
            params = ('%' + marca + '%',) if marca else ()
            cursor.execute(sql, params)
            return jsonify(cursor.fetchall())
    finally:
        conexion.close()

@app.route('/api/bateria', methods=['POST'])
def agregar_bateria():
    try:
        datos = request.get_json()
        if not datos or 'marca' not in datos or 'modelo' not in datos or 'stock' not in datos \
           or 'precio_compra' not in datos or 'precio_venta' not in datos:
            return jsonify({'error': 'Datos incompletos'}), 400

        if not isinstance(datos['stock'], int) or datos['stock'] < 0:
            return jsonify({'error': 'Stock inválido'}), 400
        try:
            pc = float(datos['precio_compra'])
            pv = float(datos['precio_venta'])
        except (TypeError, ValueError):
            return jsonify({'error': 'Precios inválidos'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "SELECT 1 FROM bateria WHERE marca = %s AND modelo = %s",
                    (datos['marca'], datos['modelo'])
                )
                if cursor.fetchone():
                    return jsonify({'error': 'La combinación marca/modelo ya existe'}), 409
                
                cursor.execute(
                    "INSERT INTO bateria (marca, modelo, stock, precio_compra, precio_venta) VALUES (%s, %s, %s, %s, %s)",
                    (datos['marca'], datos['modelo'], datos['stock'], pc, pv)
                )
                conexion.commit()
                return jsonify({
                    'mensaje': 'Batería creada',
                    'id': cursor.lastrowid,
                    'marca': datos['marca'],
                    'modelo': datos['modelo'],
                    'stock': datos['stock'],
                    'precio_compra': pc,
                    'precio_venta': pv
                }), 201
    except pymysql.Error as e:
        return jsonify({'error': 'Error de base de datos: ' + str(e)}), 500

@app.route('/api/bateria/<int:id>/sumar', methods=['PUT'])
def sumar_stock(id):
    try:
        datos = request.get_json()
        if 'stock' not in datos or not isinstance(datos['stock'], int) or datos['stock'] < 1:
            return jsonify({'error': 'Stock inválido'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "UPDATE bateria SET stock = stock + %s WHERE id_bateria = %s",
                    (datos['stock'], id)
                )
                conexion.commit()
            return jsonify({'mensaje': 'Stock actualizado'}), 200
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/bateria/<int:id>/disminuir', methods=['PUT'])
def disminuir_stock(id):
    try:
        datos = request.get_json()
        if 'stock' not in datos or not isinstance(datos['stock'], int) or datos['stock'] < 1:
            return jsonify({'error': 'Stock inválido'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT stock FROM bateria WHERE id_bateria = %s", (id,))
                resultado = cursor.fetchone()
                
                if not resultado:
                    return jsonify({'error': 'Batería no encontrada'}), 404
                
                actual = resultado['stock']
                if actual < datos['stock']:
                    return jsonify({
                        'error': f'Stock insuficiente (actual: {actual}, requerido: {datos["stock"]})'
                    }), 400
                
                nuevo_stock = actual - datos['stock']
                cursor.execute(
                    "UPDATE bateria SET stock = %s WHERE id_bateria = %s",
                    (max(nuevo_stock, 0), id)  
                )
                conexion.commit()
            return jsonify({'mensaje': 'Stock actualizado', 'nuevo_stock': max(nuevo_stock, 0)}), 200
    except pymysql.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/bateria/<int:id>', methods=['PUT'])
def actualizar_bateria(id):
    """Actualiza campos de batería. Actualmente soporta precio_compra y precio_venta."""
    datos = request.get_json(silent=True) or {}
    campos_permitidos = ['precio_compra', 'precio_venta']
    actualizaciones = {k: v for k, v in datos.items() if k in campos_permitidos}

    if not actualizaciones:
        return jsonify({'error': 'No se proporcionaron campos válidos para actualizar'}), 400

    for campo, valor in actualizaciones.items():
        try:
            num = float(valor)
            if num < 0:
                return jsonify({'error': f'{campo} debe ser >= 0'}), 400
            actualizaciones[campo] = num
        except (TypeError, ValueError):
            return jsonify({'error': f'{campo} inválido'}), 400

    try:
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                set_clause = ', '.join([f"{k} = %s" for k in actualizaciones.keys()])
                valores = list(actualizaciones.values()) + [id]
                cursor.execute(f"UPDATE bateria SET {set_clause} WHERE id_bateria = %s", valores)
                if cursor.rowcount == 0:
                    return jsonify({'error': 'Batería no encontrada'}), 404
                conexion.commit()

                cursor.execute(
                    "SELECT id_bateria as id, marca, modelo, stock, precio_compra, precio_venta FROM bateria WHERE id_bateria = %s",
                    (id,)
                )
                bateria = cursor.fetchone()
                return jsonify(bateria), 200
    except pymysql.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/bateria/marcas', methods=['GET'])
def obtener_marcas_baterias():
    """Obtiene todas las marcas únicas de la tabla baterias."""
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT DISTINCT marca FROM bateria ORDER BY marca")
            marcas = cursor.fetchall()
            return jsonify([marca['marca'] for marca in marcas])
    finally:
        conexion.close()


# ===========================
# ENDPOINTS PARA CLIENTES
# ===========================
@app.route('/api/clientes', methods=['GET'])
def obtener_clientes():
    """Obtiene todos los clientes, con filtro opcional."""
    busqueda = request.args.get('busqueda')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            if busqueda:
                sql = """
                    SELECT * FROM cliente 
                    WHERE nombre LIKE %s 
                    OR vehiculo LIKE %s 
                    OR telefono LIKE %s;
                """
                param = f'%{busqueda}%'
                cursor.execute(sql, (param, param, param))
            else:
                cursor.execute("SELECT * FROM cliente;")
            clientes = cursor.fetchall()
            return jsonify(clientes)
    finally:
        conexion.close()


@app.route('/api/clientes', methods=['POST'])
def agregar_cliente():
    """Agrega un nuevo cliente a la base de datos."""
    datos = request.json
    if not datos or 'nombre' not in datos or 'telefono' not in datos:
        return jsonify({'error': 'Nombre y teléfono son requeridos'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = """
                INSERT INTO cliente (nombre, vehiculo, telefono, direccion) 
                VALUES (%s, %s, %s, %s);
            """
            cursor.execute(sql, (
                datos['nombre'],
                datos.get('vehiculo'),
                datos['telefono'],
                datos.get('direccion')
            ))
            conexion.commit()
            nuevo_id = cursor.lastrowid
            return jsonify({'mensaje': 'Cliente agregado exitosamente', 'id_cliente': nuevo_id}), 201
    finally:
        conexion.close()


@app.route('/api/clientes/<int:id>', methods=['PUT'])
def actualizar_cliente(id):
    """Actualiza los datos de un cliente."""
    datos = request.json
    campos_permitidos = ['nombre', 'vehiculo', 'telefono', 'direccion']
    actualizaciones = {k: v for k, v in datos.items() if k in campos_permitidos}

    if not actualizaciones:
        return jsonify({'error': 'No se proporcionaron campos válidos para actualizar'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            set_clause = ', '.join([f"{k} = %s" for k in actualizaciones.keys()])
            valores = list(actualizaciones.values()) + [id]
            sql = f"UPDATE cliente SET {set_clause} WHERE id_cliente = %s;"
            cursor.execute(sql, valores)
            conexion.commit()

            cursor.execute("SELECT * FROM cliente WHERE id_cliente = %s;", (id,))
            cliente_actualizado = cursor.fetchone()
            return jsonify(cliente_actualizado)
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conexion.close()


@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def eliminar_cliente(id):
    """Elimina un cliente por su ID."""
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT id_cliente FROM cliente WHERE id_cliente = %s;", (id,))
            existe = cursor.fetchone()
            if not existe:
                return jsonify({'error': 'Cliente no encontrado'}), 404

            cursor.execute("DELETE FROM cliente WHERE id_cliente = %s;", (id,))
            conexion.commit()
            return jsonify({'mensaje': 'Cliente eliminado correctamente'}), 200
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conexion.close()

# ===========================
# ENDPOINTS PARA VENTAS
# ===========================
@app.route('/api/ventas', methods=['GET'])
def listar_ventas():
    """Lista ventas con filtros opcionales: fecha_desde, fecha_hasta, marca, modelo."""
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')
    marca = request.args.get('marca')
    modelo = request.args.get('modelo')

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            condiciones = []
            params = []

            if fecha_desde:
                condiciones.append("v.fecha >= %s")
                params.append(fecha_desde)
            if fecha_hasta:
                condiciones.append("v.fecha <= %s")
                params.append(fecha_hasta)
            if marca:
                condiciones.append("b.marca LIKE %s")
                params.append(f"%{marca}%")
            if modelo:
                condiciones.append("b.modelo LIKE %s")
                params.append(f"%{modelo}%")

            where_clause = (" WHERE " + " AND ".join(condiciones)) if condiciones else ""

            sql = f'''
                SELECT v.id_venta, v.fecha, v.total, c.nombre AS cliente,
                       b.marca, b.modelo, it.cantidad, it.precio_unitario
                FROM Venta v
                LEFT JOIN cliente c ON v.id_cliente = c.id_cliente
                INNER JOIN ItemTransaccion it ON it.id_venta = v.id_venta
                INNER JOIN bateria b ON b.id_bateria = it.id_bateria
                {where_clause}
                ORDER BY v.fecha DESC, v.id_venta DESC
            '''

            cursor.execute(sql, params)
            return jsonify(cursor.fetchall())
    finally:
        conexion.close()

@app.route('/api/ventas', methods=['POST'])
def registrar_venta():
    """Registra una nueva venta en la base de datos."""
    try:
        datos = request.get_json()
        
        # Validación de datos requeridos
        if not datos or 'marca' not in datos or 'modelo' not in datos:
            return jsonify({'error': 'Marca y modelo son requeridos'}), 400
        
        if 'cantidad' not in datos or not isinstance(datos['cantidad'], int) or datos['cantidad'] < 1:
            return jsonify({'error': 'Cantidad debe ser un número positivo'}), 400
        
        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "SELECT id_bateria, stock, precio_venta FROM bateria WHERE marca = %s AND modelo = %s",
                    (datos['marca'], datos['modelo'])
                )
                bateria = cursor.fetchone()
                
                if not bateria:
                    return jsonify({'error': 'Batería no encontrada'}), 404
                
                if bateria['stock'] < datos['cantidad']:
                    return jsonify({
                        'error': f'Stock insuficiente (disponible: {bateria["stock"]}, solicitado: {datos["cantidad"]})'
                    }), 400
                
                total = bateria['precio_venta'] * datos['cantidad']
                cursor.execute(
                    "INSERT INTO Venta (fecha, total, id_cliente) VALUES (CURDATE(), %s, %s)",
                    (total, datos.get('id_cliente'))
                )
                venta_id = cursor.lastrowid

                cursor.execute(
                    """
                    INSERT INTO ItemTransaccion (id_bateria, id_venta, id_compra, cantidad, precio_unitario)
                    VALUES (%s, %s, NULL, %s, %s)
                    """,
                    (bateria['id_bateria'], venta_id, datos['cantidad'], bateria['precio_venta'])
                )
                
                # Disminuir el stock
                cursor.execute(
                    "UPDATE bateria SET stock = stock - %s WHERE id_bateria = %s",
                    (datos['cantidad'], bateria['id_bateria'])
                )
                
                conexion.commit()
                
                return jsonify({
                    'mensaje': 'Venta registrada exitosamente',
                    'id_venta': venta_id,
                    'bateria': {'marca': datos['marca'], 'modelo': datos['modelo']},
                    'cantidad': datos['cantidad'],
                    'total': total,
                    'stock_restante': bateria['stock'] - datos['cantidad']
                }), 201
                
    except pymysql.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/bateria/modelos', methods=['GET'])
def obtener_modelos_baterias():
    """Obtiene todos los modelos de una marca específica."""
    marca = request.args.get('marca')
    if not marca:
        return jsonify({'error': 'Se requiere el parámetro marca'}), 400
    
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute(
                "SELECT id_bateria, modelo, stock, precio_venta FROM bateria WHERE marca = %s ORDER BY modelo",
                (marca,)
            )
            modelos = cursor.fetchall()
            return jsonify(modelos)
    finally:
        conexion.close()

# ===========================
# ENDPOINTS PARA PROVEEDORES
# ===========================
@app.route('/api/proveedor', methods=['GET'])
def obtener_proveedor():
    """Obtiene todos los proveedor, con filtro opcional."""
    busqueda = request.args.get('busqueda')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            if busqueda:
                sql = """
                    SELECT * FROM proveedor 
                    WHERE nombre LIKE %s 
                    OR cuit LIKE %s 
                    OR telefono LIKE %s;
                """
                param = f'%{busqueda}%'
                cursor.execute(sql, (param, param, param))
            else:
                cursor.execute("SELECT * FROM proveedor;")
            proveedor = cursor.fetchall()
            return jsonify(proveedor)
    finally:
        conexion.close()


# ===========================
# ENDPOINTS PARA COMPRAS
# ===========================
@app.route('/api/compras', methods=['GET'])
def listar_compras():
    """Lista compras con filtros opcionales: fecha_desde, fecha_hasta, marca, modelo."""
    fecha_desde = request.args.get('fecha_desde')
    fecha_hasta = request.args.get('fecha_hasta')
    marca = request.args.get('marca')
    modelo = request.args.get('modelo')

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            condiciones = []
            params = []

            if fecha_desde:
                condiciones.append("co.fecha >= %s")
                params.append(fecha_desde)
            if fecha_hasta:
                condiciones.append("co.fecha <= %s")
                params.append(fecha_hasta)
            if marca:
                condiciones.append("b.marca LIKE %s")
                params.append(f"%{marca}%")
            if modelo:
                condiciones.append("b.modelo LIKE %s")
                params.append(f"%{modelo}%")

            where_clause = (" WHERE " + " AND ".join(condiciones)) if condiciones else ""

            sql = f'''
                SELECT co.id_compra, co.fecha, co.total, p.nombre AS proveedor,
                       b.marca, b.modelo, it.cantidad, it.precio_unitario
                FROM Compra co
                LEFT JOIN proveedor p ON co.id_proveedor = p.id_proveedor
                INNER JOIN ItemTransaccion it ON it.id_compra = co.id_compra
                INNER JOIN bateria b ON b.id_bateria = it.id_bateria
                {where_clause}
                ORDER BY co.fecha DESC, co.id_compra DESC
            '''

            cursor.execute(sql, params)
            return jsonify(cursor.fetchall())
    finally:
        conexion.close()

@app.route('/api/compras', methods=['POST'])
def registrar_compra():
    """Registra una nueva compra y aumenta el stock de la batería."""
    try:
        datos = request.get_json()
        if not datos or 'marca' not in datos or 'modelo' not in datos:
            return jsonify({'error': 'Marca y modelo son requeridos'}), 400

        if 'cantidad' not in datos or not isinstance(datos['cantidad'], int) or datos['cantidad'] < 1:
            return jsonify({'error': 'Cantidad debe ser un número positivo'}), 400

        id_proveedor = datos.get('id_proveedor')
        comentario = datos.get('comentario')

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "SELECT id_bateria, stock, precio_compra FROM bateria WHERE marca = %s AND modelo = %s",
                    (datos['marca'], datos['modelo'])
                )
                bateria = cursor.fetchone()

                if not bateria:
                    return jsonify({'error': 'Batería no encontrada. Cree la batería en Stock primero.'}), 404

                precio_unitario = bateria['precio_compra'] if bateria['precio_compra'] is not None else 0.0
                total = precio_unitario * datos['cantidad']

                cursor.execute(
                    "INSERT INTO Compra (fecha, total, id_proveedor) VALUES (CURDATE(), %s, %s)",
                    (total, id_proveedor)
                )
                compra_id = cursor.lastrowid
                cursor.execute(
                    """
                    INSERT INTO ItemTransaccion (id_bateria, id_venta, id_compra, cantidad, precio_unitario)
                    VALUES (%s, NULL, %s, %s, %s)
                    """,
                    (bateria['id_bateria'], compra_id, datos['cantidad'], precio_unitario)
                )
                cursor.execute(
                    "UPDATE bateria SET stock = stock + %s WHERE id_bateria = %s",
                    (datos['cantidad'], bateria['id_bateria'])
                )

                conexion.commit()

                return jsonify({
                    'mensaje': 'Compra registrada exitosamente',
                    'id_compra': compra_id,
                    'bateria': {'marca': datos['marca'], 'modelo': datos['modelo']},
                    'cantidad': datos['cantidad'],
                    'total': total,
                    'stock_nuevo': bateria['stock'] + datos['cantidad']
                }), 201
    except pymysql.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500

@app.route('/api/proveedor', methods=['POST'])
def agregar_proveedor():
    """Agrega un nuevo proveedor a la base de datos."""
    datos = request.json
    if not datos or 'nombre' not in datos or 'cuit' not in datos or 'telefono' not in datos:
        return jsonify({'error': 'Nombre y teléfono son requeridos'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = """
                INSERT INTO proveedor (nombre, cuit, telefono) 
                VALUES (%s, %s, %s);
            """
            cursor.execute(sql, (
                datos['nombre'],
                datos.get('cuit'),
                datos['telefono'],
            ))
            conexion.commit()
            nuevo_id = cursor.lastrowid
            return jsonify({'mensaje': 'Proveedor agregado exitosamente', 'id_proveedor': nuevo_id}), 201
    finally:
        conexion.close()


@app.route('/api/proveedor/<int:id>', methods=['PUT'])
def actualizar_proveedor(id):
    """Actualiza los datos de un proveedor."""
    datos = request.json
    campos_permitidos = ['nombre', 'cuit', 'telefono']
    actualizaciones = {k: v for k, v in datos.items() if k in campos_permitidos}

    if not actualizaciones:
        return jsonify({'error': 'No se proporcionaron campos válidos para actualizar'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            set_clause = ', '.join([f"{k} = %s" for k in actualizaciones.keys()])
            valores = list(actualizaciones.values()) + [id]
            sql = f"UPDATE proveedor SET {set_clause} WHERE id_proveedor = %s;"
            cursor.execute(sql, valores)
            conexion.commit()

            cursor.execute("SELECT * FROM proveedor WHERE id_proveedor = %s;", (id,))
            proveedor_actualizado = cursor.fetchone()
            return jsonify(proveedor_actualizado)
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conexion.close()


@app.route('/api/proveedor/<int:id>', methods=['DELETE'])
def eliminar_proveedor(id):
    """Elimina un proveedor por su ID."""
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT id_proveedor FROM proveedor WHERE id_proveedor = %s;", (id,))
            existe = cursor.fetchone()
            if not existe:
                return jsonify({'error': 'Proveedor no encontrado'}), 404

            cursor.execute("DELETE FROM proveedor WHERE id_proveedor = %s;", (id,))
            conexion.commit()
            return jsonify({'mensaje': 'Proveedor eliminado correctamente'}), 200
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conexion.close()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
