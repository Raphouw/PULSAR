'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const DynamicSidebar = dynamic(() => import('../components/layout/sidebar'), { 
    ssr: false,
    loading: () => null
});

export default function LayoutContent({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    
    const isAuthPage = pathname ? pathname.startsWith('/auth') : false;

    return (
        <>
            {!isAuthPage && <DynamicSidebar />}
            <main style={{ 
                marginLeft: isAuthPage ? '0px' : 'var(--sidebar-width)', 
                padding: isAuthPage ? '0' : '1.5rem',
                width: `calc(100% - ${isAuthPage ? '0px' : 'var(--sidebar-width)'})`,
                boxSizing: 'border-box',
                minHeight: '100vh',
                transition: 'margin-left 0.3s ease',
            }}>
                {children}
            </main>
        </>
    );
}