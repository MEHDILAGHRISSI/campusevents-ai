export const demoUsers = [
  {
    email: 'admin@campus.ma',
    password: 'admin123',
    role: 'admin' as const,
    displayName: 'Admin Campus',
  },
  {
    email: 'etudiant@campus.ma',
    password: 'etudiant123',
    role: 'student' as const,
    displayName: 'Etudiant Campus',
  },
];

export function findDemoUser(email: string, password: string) {
  return demoUsers.find((user) => user.email === email.trim().toLowerCase() && user.password === password);
}
