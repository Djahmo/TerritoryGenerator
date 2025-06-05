import { btnPositive } from './../../components/button.js';

const data = {
  title: "Signup Confirmation",
  children: /*html*/ `
    Hello {{name}},<br /><br />
    Click on the button below to confirm your account :
    <br /><br />
    ${btnPositive('Confirm my account')}
  `,
}

export default data
