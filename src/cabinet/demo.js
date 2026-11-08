// UI fixtures only. No API, authentication, or persistent customer data.
export const demoCars = [
  { id: 'sample-1', model: 'Chevrolet Malibu', plate: '01 A 001 AA', owner: 'sample-user' },
  { id: 'sample-2', model: 'Chevrolet Cobalt', plate: '01 B 002 BB', owner: 'sample-user' },
  { id: 'sample-3', model: 'Kia K5', plate: '01 C 003 CC', owner: 'sample-user' },
  { id: 'sample-4', model: 'Chevrolet Onix', plate: '01 D 004 DD', owner: 'sample-other' },
];
export const demoClients = Array.from({ length: 11 }, (_, i) => ({ id: `client-${i + 1}`, name: `Namuna Mijoz ${i + 1}`, phone: `+99890000${String(i + 1).padStart(4, '0')}` }));
export const services = [
  { id: 'balonlar', name: 'Balonlar', icon: 'tires' },
  { id: 'motor-moyi', name: 'Motor moyi', icon: 'oil' },
  { id: 'tonirovka', name: 'Tonirovka', icon: 'tint' },
  { id: 'antifriz', name: 'Antifriz', icon: 'antifreeze' },
];
export const screenOptions = [
  ['/kirish', 'User — kirish'], ['/royxatdan-otish', 'User — akkaunt yaratish'],
  ['/user/mashinalar', 'User — mashinalar'], ['/user/xizmatlar', 'User — xizmatlar'],
  ['/user/xizmatlar/balonlar', 'User — balonlar'], ['/user/xizmatlar/motor-moyi', 'User — motor moyi'],
  ['/user/xizmatlar/antifriz', 'User — antifriz'], ['/user/xizmatlar/tonirovka', 'User — tonirovka'], ['/user/profil', 'User — profil'],
  ['/admin/kirish', 'Admin — kirish'], ['/admin/taklif', 'Admin — taklif orqali akkaunt'],
  ['/admin/bosh-sahifa', 'Admin — bosh sahifa'], ['/admin/mijozlar', 'Admin — mijozlar'], ['/admin/mijoz-qoshish', 'Admin — mijoz qo‘shish'],
  ['/admin/mashinalar', 'Admin — mashinalar'], ['/admin/xizmatlar', 'Admin — bo‘limlar'], ['/admin/profil', 'Admin — profil'],
];
