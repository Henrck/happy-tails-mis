// Mock pet + owner records. Owner IDs and Pet IDs exist specifically to
// disambiguate people/pets sharing the same name (Josh's explicit
// concern) — the name is never the identifier, the ID always is.
export type Sex = "Male" | "Female";
export type Species = "Dog" | "Cat";

export type Owner = {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  contactNumber: string;
  address: string;
};

export type Pet = {
  id: string;
  name: string;
  species: Species;
  breed: string;
  age: number;
  sex: Sex;
  ownerId: string;
};

export const owners: Owner[] = [
  { id: "O-001", name: "Jearron Brigoli", age: 28, sex: "Male", contactNumber: "0987654456", address: "Cavite City" },
  { id: "O-002", name: "Kate Palcis", age: 24, sex: "Female", contactNumber: "0917111222", address: "Cavite City" },
  { id: "O-003", name: "Josh Hernandez", age: 22, sex: "Male", contactNumber: "0987654456", address: "Cavite City" },
];

export const pets: Pet[] = [
  { id: "PET-001", name: "Milo", species: "Dog", breed: "Shih Tzu", age: 2, sex: "Male", ownerId: "O-001" },
  { id: "PET-002", name: "Irish", species: "Cat", breed: "Garfield", age: 1, sex: "Female", ownerId: "O-001" },
  { id: "PET-003", name: "Berto", species: "Dog", breed: "Shih Tzu", age: 3, sex: "Male", ownerId: "O-001" },
  { id: "PET-004", name: "Josh", species: "Dog", breed: "Shih Tzu", age: 2, sex: "Male", ownerId: "O-001" },
  { id: "PET-005", name: "Mark", species: "Dog", breed: "Shih Tzu", age: 4, sex: "Male", ownerId: "O-001" },
  { id: "PET-006", name: "Ani", species: "Dog", breed: "Chihuahua", age: 1, sex: "Female", ownerId: "O-002" },
  { id: "PET-007", name: "Coco", species: "Cat", breed: "Persian", age: 2, sex: "Female", ownerId: "O-002" },
  { id: "PET-008", name: "Rex", species: "Dog", breed: "Aspin", age: 5, sex: "Male", ownerId: "O-002" },
  { id: "PET-009", name: "Ceddy", species: "Dog", breed: "Shih Tzu", age: 2, sex: "Male", ownerId: "O-003" },
  { id: "PET-010", name: "Cody", species: "Dog", breed: "Aspin/Chuwawa", age: 3, sex: "Male", ownerId: "O-003" },
];
