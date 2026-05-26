// app/page.tsx
// Redireciona a raiz para /map

import { redirect } from 'next/navigation'
export default function Home() { redirect('/map') }
