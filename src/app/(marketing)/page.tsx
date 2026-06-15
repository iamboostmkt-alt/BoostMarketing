import { redirect } from 'next/navigation';

// La raíz / redirige a la landing de Weeklink
export default function RootPage() {
  redirect('/weeklink');
}
