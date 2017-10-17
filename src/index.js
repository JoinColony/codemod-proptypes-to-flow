import transformEs6ClassComponents from './transformers/es6Classes';
import transformFunctionalComponents from './transformers/functional';
import ReactUtils from './helpers/ReactUtils';

function addFlowComment(j, ast) {
  const getBodyNode = () => ast.find(j.Program).get('body', 0).node;

  const comments = getBodyNode().comments || [];
  const containsFlowComment =
    comments.filter(e => e.value.indexOf('@flow') !== -1).length > 0;

  if (!containsFlowComment) {
    comments.unshift(j.commentBlock(' @flow '));
  }

  getBodyNode().comments = comments;
}

export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  const reactUtils = ReactUtils(j);
  if (!reactUtils.hasReact(root)) {
    return file.source;
  }

  let modifications;

  if (root.find(j.ClassDeclaration).length) {
    modifications = transformEs6ClassComponents(root, j);
  } else {
    modifications = transformFunctionalComponents(root, j);
  }

  if (modifications) {
    addFlowComment(j, root);
    return root.toSource({ quote: 'single', trailingComma: true });
  } else {
    return file.source;
  }
}
