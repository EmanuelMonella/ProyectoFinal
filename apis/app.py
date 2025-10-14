from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)

def obtener_conexion():
    return pymysql.connect(
        host='localhost',
        user='ema',
        password='12345',
        database='BADIA',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/bateria', methods=['GET'])
def obtener_baterias():
    marca = request.args.get('marca')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            if marca:
                cursor.execute("SELECT * FROM bateria WHERE marca LIKE %s;", ('%' + marca + '%',))
            else:
                cursor.execute("SELECT * FROM bateria;")
            baterias = cursor.fetchall()
            return jsonify(baterias)
    finally:
        conexion.close()

@app.route('/api/usuarios/<int:usuario_id>', methods=['PUT'])
def actualizar_email(usuario_id):
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
@app.route('/api/bateria', methods=['POST'])
def agregar_bateria():
    datos = request.json
    marca = datos.get('marca')
    modelo = datos.get('modelo')
    stock = datos.get('stock')

    if not marca or not modelo or stock is None:
        return jsonify({'error': 'Marca, modelo y stock son requeridos'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("INSERT INTO bateria (marca, modelo, stock) VALUES (%s, %s, %s);", (marca, modelo, stock))
            conexion.commit()
            return jsonify({'mensaje': 'Batería agregada exitosamente'}), 201
    finally:
        conexion.close()   

@app.route('/api/bateria/<int:id>/disminuir', methods=['PUT'])
def disminuir_stock(id):
    datos = request.json
    cantidad = datos.get('cantidad', 1)
    if cantidad < 1:
        return jsonify({'error': 'Cantidad inválida'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT stock FROM bateria WHERE id = %s;", (id,))
            bateria = cursor.fetchone()
            if not bateria or bateria['stock'] < cantidad:
                return jsonify({'error': 'No encontrado o stock insuficiente'}), 404
            cursor.execute("UPDATE bateria SET stock = stock - %s WHERE id = %s;", (cantidad, id))
            conexion.commit()
            cursor.execute("SELECT * FROM bateria WHERE id = %s;", (id,))
            bateria_actualizada = cursor.fetchone()
            return jsonify(bateria_actualizada)
    finally:
        conexion.close()

@app.route('/api/bateria/<int:id>/sumar', methods=['PUT'])
def sumar_stock(id):
    datos = request.json
    cantidad = datos.get('cantidad', 1)
    if cantidad < 1:
        return jsonify({'error': 'Cantidad inválida'}), 400

    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            cursor.execute("SELECT stock FROM bateria WHERE id = %s;", (id,))
            bateria = cursor.fetchone()
            if not bateria:
                return jsonify({'error': 'No encontrado'}), 404
            cursor.execute("UPDATE bateria SET stock = stock + %s WHERE id = %s;", (cantidad, id))
            conexion.commit()
            cursor.execute("SELECT * FROM bateria WHERE id = %s;", (id,))
            bateria_actualizada = cursor.fetchone()
            return jsonify(bateria_actualizada)
    finally:
        conexion.close()
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
