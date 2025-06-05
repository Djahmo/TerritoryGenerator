import { btnPositive } from '../../components/button.js';

const data = {
  title: "Password Reset",
  children: /*html*/ `
    Hello {{name}},<br /><br />
    Click on the button below to reset your password :
    <br /><br />
    ${btnPositive('Reset my password')}
  `,
}

export default data
