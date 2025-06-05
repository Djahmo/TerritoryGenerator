export const btnPositive = (label:string) =>  /*html*/ `
  <a href="{{link}}" style="
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    border-radius: 2px;
    transition: background-color 0.2s ease-in-out;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: none;
    background-color: #FFA743;
    color: #FFFFFF;
  ">
    ${label}
  </a>
`
