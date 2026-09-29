export const typeDefs = `#graphql
  scalar BigInt
  scalar DateTime

  type User {
    id: BigInt!
    name: String!
    email: String!
    avatar: String
  }

  type Tag {
    id: BigInt!
    name: String!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Image {
    id: BigInt!
    name: String!
    noteId: BigInt
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Phrase {
    id: BigInt!
    text: String!
    author: String!
    tags: [Tag!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type Note {
    id: BigInt!
    date: DateTime!
    text: String!
    tags: [Tag!]!
    images: [Image!]!
    createdAt: DateTime
    updatedAt: DateTime
  }

  type PageInfo {
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type PhraseConnection {
    items: [Phrase!]!
    pageInfo: PageInfo!
  }

  type NoteConnection {
    items: [Note!]!
    pageInfo: PageInfo!
  }

  input UpdateProfileInput {
    name: String
    avatar: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  input PaginationInput {
    limit: Int = 20
    offset: Int = 0
  }

  input PhrasesFilter {
    author: String
    tagIds: [BigInt!]
  }

  input NotesFilter {
    tagIds: [BigInt!]
  }

  input CreatePhraseInput {
    text: String!
    author: String!
    tagIds: [BigInt!]
  }

  input UpdatePhraseInput {
    text: String
    author: String
    tagIds: [BigInt!]
  }

  input CreateNoteInput {
    text: String!
    date: DateTime
    tagIds: [BigInt!]
    imageUrls: [String!]
  }

  input UpdateNoteInput {
    text: String
    date: DateTime
    tagIds: [BigInt!]
  }

  type Query {
    
    hello: String
    me: User
    randomPhrase: Phrase

    phrases(filter: PhrasesFilter, pagination: PaginationInput): PhraseConnection!
    phrase(id: BigInt!): Phrase

    notes(filter: NotesFilter, pagination: PaginationInput): NoteConnection!
    note(id: BigInt!): Note

    tags: [Tag!]!
    tag(id: BigInt!): Tag
  }

  type Mutation {

    deleteManyNotes(ids: [BigInt!]!): Int!
    deleteManyPhrases(ids: [BigInt!]!): Int!
    deleteManyTags(ids: [BigInt!]!): Int!

     updateProfile(input: UpdateProfileInput!): User!
    changePassword(input: ChangePasswordInput!): Boolean!

    createNote(input: CreateNoteInput!): Note!
    updateNote(id: BigInt!, input: UpdateNoteInput!): Note!
    deleteNote(id: BigInt!): Boolean!
    addImageToNote(noteId: BigInt!, url: String!): Image!
    removeImage(imageId: BigInt!): Boolean!

    createPhrase(input: CreatePhraseInput!): Phrase!
    updatePhrase(id: BigInt!, input: UpdatePhraseInput!): Phrase!
    deletePhrase(id: BigInt!): Boolean!

    createTag(name: String!): Tag!
    updateTag(id: BigInt!, name: String!): Tag!
    deleteTag(id: BigInt!): Boolean!
  }
`;