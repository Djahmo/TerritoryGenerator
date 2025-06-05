import { btnPositive } from './../../components/button.js';

const data = {
  title: "Confirmation de l'inscription",
  children: /*html*/ `
    Bonjour <b>{{name}}</b>,<br /><br />
    Clique sur le bouton ci-dessous pour confirmer ton compte :
    <br /><br />
    ${btnPositive('Confirmer mon compte')}
  `,
}

export default data
