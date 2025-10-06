import { useParams, usePathname, useRouter } from 'next/navigation';

export function withParams(WrappedComponent: any) {
    return function ParamsWrappedComponent(props: any) {
        const params = useParams();
        return <WrappedComponent {...props} params={params} />;
    };
}

export function withPathname(WrappedComponent: any) {
    return function PathnameWrappedComponent(props: any) {
        const pathname = usePathname();
        return <WrappedComponent {...props} pathname={pathname} />;
    };
}

export function withRouter(WrappedComponent: any) {
    return function RouterWrappedComponent(props: any) {
        const router = useRouter();
        return <WrappedComponent {...props} router={router} />;
    };
}
