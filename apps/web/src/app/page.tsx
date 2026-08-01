import { redirect } from 'next/navigation';

export default function Home() {
  // Trang marketing sẽ thay thế sau; hiện tại chuyển thẳng vào đăng nhập
  redirect('/login');
}
