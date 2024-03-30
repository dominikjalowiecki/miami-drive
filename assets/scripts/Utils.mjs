export default class Utils {
  static getElement(selectors) {
    return document.querySelector(selectors);
  }

  static getAllElements(selectors) {
    return Array.from(document.querySelectorAll(selectors));
  }
}
