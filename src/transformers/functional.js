import propTypeToFlowType from '../helpers/propTypeToFlowType';

export default function transformFunctionalComponents(root, j) {
  const meta = getMeta(root, j);
  replacePropTypes(root, j, meta);
  insertTypeAnnotation(root, j, meta);
  removeImport(root, j);
  return true;
}

function insertTypeAnnotation(root, j, { componentName }) {
  const declaration = root.find(j.VariableDeclarator, { id: { name: componentName }});
  const typeAnnotation = j.typeAnnotation(j.genericTypeAnnotation(j.identifier('Props'), null));
  const functionExpression = declaration.find(j.ArrowFunctionExpression);
  functionExpression.find(j.ObjectPattern).forEach(objectSpread => {
    objectSpread.value.typeAnnotation = typeAnnotation;
  });
}

function replacePropTypes(root, j, { componentName, propTypes, propTypesDeclaration }) {
  const flowTypes = getFlowTypes(propTypes, j);
  if (propTypesDeclaration) {
    propTypesDeclaration.forEach(f => f.parent.insertBefore(flowTypes));
	propTypesDeclaration.remove();
  } else {
    const declaration = root.find(j.VariableDeclarator, { id: { name: componentName }});
    declaration.forEach(f => f.parent.insertBefore(flowTypes));
  }
}

function removeImport (root, j) {
  root.find(j.ImportSpecifier, {
    local: { name: 'PropTypes' }
  }).remove();
}

function getMeta(root, j) {
  const assignment = root
    .find(j.AssignmentExpression, {
      left: {
        property: {
          name: 'propTypes',
        },
      },
    })
  const assignmentNode = assignment.nodes()[0];
  let propTypes;
  let propTypesDeclaration;
  if (assignmentNode.right.type === 'ObjectExpression') {
     propTypes = assignmentNode.right.properties;
  } else {
    const propTypesVarName = assignmentNode.right.name;
    propTypesDeclaration = root.find(j.VariableDeclarator, { id: { name: propTypesVarName }});
    const node = propTypesDeclaration.nodes()[0];
    propTypes = node.init.properties;
  }
  const componentName = assignmentNode.left.object.name;
  assignment.remove();
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
