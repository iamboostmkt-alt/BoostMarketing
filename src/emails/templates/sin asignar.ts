export function welcomeEmail(name: string) {
  return `
    <div style="font-family: Arial; padding: 20px;">
      <h1>Bienvenido, ${name} 🚀</h1>
      <p>Tu cuenta fue creada correctamente en BoostMarketing.</p>

      <hr />

      <p style="color: #666;">
        Si no fuiste tú, ignora este correo.
      </p>
    </div>
  `;
}