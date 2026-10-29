import Resource from "./models/Resource.js";

const starterResources = [
  { name: "Maker Space", category: "Spaces", type: "Creative studio", description: "A bright, hands-on space for building, creating and making a little mess.", capacity: "Up to 24", location: "Innovation Wing · 1F", availability: "Available today", rating: 4.9, visual: "maker" },
  { name: "Projector Kit", category: "Technology", type: "Teaching tech", description: "Take your lesson beyond the whiteboard with an HD portable projector.", capacity: "1 kit", location: "Media Desk · Library", availability: "Available today", rating: 4.8, visual: "projector" },
  { name: "Science Lab", category: "Spaces", type: "Learning space", description: "A fully equipped lab for experiments, discovery and big questions.", capacity: "Up to 30", location: "Science Block · 2F", availability: "Limited slots", rating: 4.9, visual: "lab" },
  { name: "Camera Kit", category: "Equipment", type: "Media equipment", description: "A classroom-ready camera kit for student films and creative projects.", capacity: "1 kit", location: "Media Desk · Library", availability: "Available today", rating: 4.7, visual: "camera" },
  { name: "Laptop Cart", category: "Technology", type: "Classroom tech", description: "A cart of charged laptops, ready for research, coding and collaboration.", capacity: "24 devices", location: "IT Hub · Ground floor", availability: "Limited slots", rating: 4.8, visual: "laptop" },
  { name: "Reading Nook", category: "Spaces", type: "Quiet space", description: "A cozy corner for small-group reading, reflection and quiet focus.", capacity: "Up to 8", location: "Library · East corner", availability: "Available today", rating: 4.6, visual: "reading" }
];

export async function seedResources() {
  const count = await Resource.countDocuments();
  if (count === 0) {
    await Resource.insertMany(starterResources);
    console.log("Added six starter resources to MongoDB.");
  }
}
