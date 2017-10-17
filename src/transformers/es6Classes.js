import propTypeToFlowType from '../helpers/propTypeToFlowType';

export default function transformEs6ClassComponents(root, j) {
  const meta = getMeta(root, j);
  replacePropTypes(root, j, meta);
  insertTypeAnnotation(root, j, meta);
  removeImport(root, j);
  return true;
}

function insertTypeAnnotation(root, j, { componentName }) {
  const genericAnnotation = j.genericTypeAnnotation(j.identifier('Props'), null);
  const superTypeAnnotation = j.typeParameterInstantiation([genericAnnotation]);
  const declaration = root.find(j.ClassDeclaration);
  const constructor = root.find(j.MethodDefinition, { key: { name: 'constructor' }}).find(j.FunctionExpression);
  if (constructor.length) {
    constructor.forEach(p => {
      p.value.params[0].typeAnnotation = j.typeAnnotation(genericAnnotation);
    });
  }
  declaration.forEach(p => p.value.superTypeParameters = superTypeAnnotation);
}

function replacePropTypes(root, j, { componentName, propTypes, propTypesDeclaration }) {
  const flowTypes = getFlowTypes(propTypes, j);
  const declaration = root.find(j.ClassDeclaration);
  declaration.insertBefore(flowTypes);
}

function removeImport (root, j) {
  root.find(j.ImportSpecifier, {
    local: { name: 'PropTypes' }
  }).remove();
}

function getMeta(root, j) {
  const staticPropTypes = root
    .find(j.ClassProperty, {
      key: {
        name: 'propTypes',
      },
    })
  const assignmentNode = staticPropTypes.nodes()[0];
  const propTypes = assignmentNode.value.properties;
  const propTypesDeclaration = staticPropTypes;
  staticPropTypes.remove();
  const declaration = root.find(j.ClassDeclaration);
  const componentName = declaration.nodes()[0].id.name;
  return {
    propTypesDeclaration,
    propTypes,
    componentName,
  }
}

function getFlowTypes(properties, j) {
  const flowTypesRemoved = properties.map(property => {
    const t = propTypeToFlowType(j, property.key, property.value);
    t.comments = property.comments;
    return t;
  });
  const flowTypeProps = j.exportNamedDeclaration(
      j.typeAlias(
        j.identifier('Props'),
        null,
        j.objectTypeAnnotation(flowTypesRemoved)
      )
    );
  return flowTypeProps;
}
