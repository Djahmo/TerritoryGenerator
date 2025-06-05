import { btnPositive } from '../../components/button.js';

const data = {
  title: "Réinitialisation du mot de passe",
  children: /*html*/ `
    Bonjour <b>{{name}}</b>,<br /><br />
    Clique sur le bouton ci-dessous pour réinitialiser ton mot de passe :
    <br /><br />
    ${btnPositive('Réinitialiser mon mot de passe')}
  `,
}

export default data
