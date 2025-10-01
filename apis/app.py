from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
import pymysql

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

def obtener_conexion():
    return pymysql.connect(
        host='localhost',
        user='ema',
        password='12345',
        database='usuarios',
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    nombre = request.args.get('nombre')
    conexion = obtener_conexion()
    try:
        with conexion.cursor() as cursor:
            if nombre:
                cursor.execute("SELECT * FROM usuarios WHERE nombre LIKE %s;", ('%' + nombre + '%',))
            else:
                cursor.execute("SELECT * FROM usuarios;")
            usuarios = cursor.fetchall()
            return jsonify(usuarios)
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
    app.run(debug=True)
