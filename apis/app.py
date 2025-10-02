from flask import Flask, jsonify, request
from flask_cors import CORS
import pymysql

app = Flask(__name__)

# ✅ CORS habilitado correctamente para TODOS los orígenes y rutas
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

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
