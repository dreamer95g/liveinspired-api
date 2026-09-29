import { GraphQLError } from 'graphql';

function isIntrospection(document) {
  return document.definitions.some((def) => {
    if (def.kind !== 'OperationDefinition') return false;
    return def.selectionSet.selections.some(
      (sel) => sel.kind === 'Field' && sel.name.value === '__schema'
    );
  });
}

export const authPlugin = {
  async requestDidStart() {
    return {
      async didResolveOperation({ document, contextValue }) {
        if (isIntrospection(document)) return;

        if (!contextValue?.user) {
          throw new GraphQLError('No autenticado', {
            extensions: { code: 'UNAUTHENTICATED' },
          });
        }
      },
    };
  },
};