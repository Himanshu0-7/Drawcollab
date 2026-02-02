const adjectives = [
  "Blue", "Neon", "Silent", "Swift", "Pixel", "Cosmic", "Fuzzy"
];

const animals = [
  "Panda", "Fox", "Tiger", "Owl", "Wolf", "Koala", "Hawk"
];

function generateUsername() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj} ${animal} ${num}`;
}

module.exports = generateUsername;
