function redirigir() { 
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;

    if (usuario === 'badia' && contrasena === '4038') {
        window.location.href = "pages/index.html";
    } else {
        alert('Usuario o contraseña incorrectos');
    }
    
}
