// test/helpers/stub-model.js
// Utilidad para "parchar" métodos estáticos y de instancia de un Modelo de Mongoose.
function stubModel(Model, { statics = {}, proto = {} } = {}) {
    const originals = { statics: {}, proto: {} };
  
    for (const k of Object.keys(statics)) {
      originals.statics[k] = Model[k];
      Model[k] = statics[k];
    }
    for (const k of Object.keys(proto)) {
      originals.proto[k] = Model.prototype[k];
      Model.prototype[k] = proto[k];
    }
  
    // Restaurar a su estado original
    return function restore() {
      for (const k of Object.keys(originals.statics)) Model[k] = originals.statics[k];
      for (const k of Object.keys(originals.proto)) Model.prototype[k] = originals.proto[k];
    };
  }
  
  module.exports = { stubModel };
  