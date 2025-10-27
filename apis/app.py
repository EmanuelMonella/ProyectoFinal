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
# ENDPOINTS PARA BATERÍAS
# ===========================
@app.route('/api/bateria', methods=['GET'])
def obtener_baterias():
    marca = request.args.get('marca')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = "SELECT id_bateria as id, marca, modelo, stock FROM bateria" + (" WHERE marca LIKE %s" if marca else "")
            params = ('%' + marca + '%',) if marca else ()
            cursor.execute(sql, params)
            return jsonify(cursor.fetchall())
    finally:
        conexion.close()

@app.route('/api/bateria', methods=['POST'])
def agregar_bateria():
    try:
        datos = request.get_json()
        if not datos or 'marca' not in datos or 'modelo' not in datos or 'stock' not in datos:
            return jsonify({'error': 'Datos incompletos'}), 400

        if not isinstance(datos['stock'], int) or datos['stock'] < 0:
            return jsonify({'error': 'Stock inválido'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "SELECT id FROM bateria WHERE marca = %s AND modelo = %s",
                    (datos['marca'], datos['modelo'])
                )
                if cursor.fetchone():
                    return jsonify({'error': 'La combinación marca/modelo ya existe'}), 409
                
                cursor.execute(
                    "INSERT INTO bateria (marca, modelo, stock) VALUES (%s, %s, %s)",
                    (datos['marca'], datos['modelo'], datos['stock'])
                )
                conexion.commit()
                return jsonify({
                    'mensaje': 'Batería creada',
                    'id': cursor.lastrowid,
                    'marca': datos['marca'],
                    'modelo': datos['modelo'],
                    'stock': datos['stock']
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
                
                # Disminución segura con protección contra negativos
                nuevo_stock = actual - datos['stock']
                cursor.execute(
                    "UPDATE bateria SET stock = %s WHERE id_bateria = %s",
                    (max(nuevo_stock, 0), id)  # Nunca menor a 0
                )
                conexion.commit()
            return jsonify({'mensaje': 'Stock actualizado', 'nuevo_stock': max(nuevo_stock, 0)}), 200
    except pymysql.Error as e:
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {str(e)}'}), 500


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
