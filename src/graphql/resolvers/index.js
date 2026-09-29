import { BigIntScalar, DateTimeScalar } from '../scalars.js';
import { phraseQueries, phraseMutations } from './phrase.js';
import { tagQueries, tagMutations } from './tag.js';
import { noteQueries, noteMutations } from './note.js';
import { userQueries, userMutations } from './user.js';

export const resolvers = {
  BigInt: BigIntScalar,
  DateTime: DateTimeScalar,

  Query: {
    hello: () => '¡El servidor Express con Apollo y Prisma está vivo!',
    ...phraseQueries,
    ...tagQueries,
    ...noteQueries,
    ...userQueries,
  },

  Mutation: {
    ...phraseMutations,
    ...tagMutations,
    ...noteMutations,
    ...userMutations,
  },
};