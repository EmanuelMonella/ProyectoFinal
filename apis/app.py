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

# ENDPOINTS PARA BATERÍAS
@app.route('/api/bateria', methods=['GET'])
def obtener_baterias():
    """Obtiene todas las baterías, con posibilidad de filtro por marca."""
    marca = request.args.get('marca')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = "SELECT * FROM bateria" + (" WHERE marca LIKE %s" if marca else "")
            params = ('%' + marca + '%',) if marca else ()
            cursor.execute(sql, params)
            return jsonify(cursor.fetchall())
    finally:
        conexion.close()

@app.route('/api/bateria', methods=['POST'])
def agregar_bateria():
    """Agrega una nueva batería a la base de datos."""
    try:
        datos = request.get_json()
        
        # Validación de datos
        if not datos or 'marca' not in datos or 'modelo' not in datos or 'cantidad' not in datos:
            return jsonify({'error': 'Datos incompletos'}), 400
            
        if not isinstance(datos['cantidad'], int) or datos['cantidad'] < 0:
            return jsonify({'error': 'Cantidad inválida'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                # Verificar existencia
                cursor.execute(
                    "SELECT id FROM bateria WHERE marca = %s AND modelo = %s",
                    (datos['marca'], datos['modelo'])
                )
                if cursor.fetchone():
                    return jsonify({'error': 'La combinación marca/modelo ya existe'}), 409
                
                # Insertar nuevo registro
                cursor.execute(
                    "INSERT INTO bateria (marca, modelo, cantidad) VALUES (%s, %s, %s)",
                    (datos['marca'], datos['modelo'], datos['cantidad'])
                )
                conexion.commit()
                return jsonify({
                    'mensaje': 'Batería creada',
                    'id': cursor.lastrowid,
                    'marca': datos['marca'],
                    'modelo': datos['modelo'],
                    'cantidad': datos['cantidad']
                }), 201
                
    except pymysql.IntegrityError as e:
        return jsonify({'error': 'Error de integridad: ' + str(e)}), 400
    except pymysql.Error as e:
        return jsonify({'error': 'Error de base de datos: ' + str(e)}), 500

@app.route('/api/bateria/<int:id>/disminuir', methods=['PUT'])
def disminuir_stock(id):
    """Disminuye el stock de una batería."""
    try:
        cantidad = request.json.get('cantidad', 1)
        if not isinstance(cantidad, int) or cantidad < 1:
            return jsonify({'error': 'Cantidad inválida'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT cantidad FROM bateria WHERE id = %s", (id,))
                resultado = cursor.fetchone()
                
                if not resultado:
                    return jsonify({'error': 'Batería no encontrada'}), 404
                
                if resultado['cantidad'] < cantidad:
                    return jsonify({'error': 'Stock insuficiente'}), 400
                
                cursor.execute(
                    "UPDATE bateria SET cantidad = cantidad - %s WHERE id = %s",
                    (cantidad, id)
                )
                conexion.commit()
                return jsonify({
                    'nueva_cantidad': resultado['cantidad'] - cantidad,
                    'mensaje': 'Stock actualizado'
                })
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/bateria/<int:id>/sumar', methods=['PUT'])
def sumar_stock(id):
    """Aumenta el stock de una batería."""
    try:
        cantidad = request.json.get('cantidad', 1)
        if not isinstance(cantidad, int) or cantidad < 1:
            return jsonify({'error': 'Cantidad inválida'}), 400

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(
                    "UPDATE bateria SET cantidad = cantidad + %s WHERE id = %s",
                    (cantidad, id)
                )
                conexion.commit()
                return jsonify({'mensaje': 'Stock incrementado correctamente'})
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500

# Endpoints para Clientes
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
    required_fields = ['nombre', 'telefono']
    if not all(field in datos for field in required_fields):
        return jsonify({'error': 'Nombre y teléfono son requeridos'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            sql = """
                INSERT INTO cliente 
                (nombre, vehiculo, telefono, direccion) 
                VALUES (%s, %s, %s, %s);
            """
            cursor.execute(sql, (
                datos['nombre'],
                datos.get('vehiculo'),
                datos['telefono'],
                datos.get('direccion')
            ))
            conexion.commit()
            return jsonify({'mensaje': 'Cliente agregado exitosamente'}), 201
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
            
            sql = f"UPDATE cliente SET {set_clause} WHERE id = %s;"
            cursor.execute(sql, valores)
            conexion.commit()
            
            cursor.execute("SELECT * FROM cliente WHERE id = %s;", (id,))
            cliente_actualizado = cursor.fetchone()
            return jsonify(cliente_actualizado)
    finally:
        conexion.close()

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def eliminar_cliente(id):
    """Elimina un cliente de la base de datos por su id."""
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT id FROM clientes WHERE id = %s;", (id,))
            existe = cursor.fetchone()
            if not existe:
                return jsonify({'error': 'Cliente no encontrado'}), 404

            cursor.execute("DELETE FROM clientes WHERE id = %s;", (id,))
            conexion.commit()
            return jsonify({'message': 'Cliente eliminado'}), 200
    except pymysql.Error as e:
        return jsonify({'error': str(e)}), 500
    finally:
        conexion.close()

# Endpoint para Usuarios (existente)
@app.route('/api/usuarios/<int:usuario_id>', methods=['PUT'])
def actualizar_email(usuario_id):
    """Actualiza el correo electrónico de un usuario."""
    nuevo_email = request.json.get('email')
    if not nuevo_email:
        return jsonify({'error': 'El email es requerido'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("UPDATE usuarios SET email = %s WHERE id = %s;", (nuevo_email, usuario_id))
            conexion.commit()
            return jsonify({'mensaje': 'Email actualizado exitosamente'})
    finally:
        conexion.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)