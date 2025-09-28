function redirigir() { 
    const usuario = document.getElementById('usuario').value;
    const contrasena = document.getElementById('contrasena').value;

    if (usuario === '' && contrasena === '') {
        window.location.href = "pages/principal.html";
    } else {
        alert('Usuario o contraseña incorrectos');
    }
    
}
