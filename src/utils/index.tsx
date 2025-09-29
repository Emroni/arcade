export function compose(...rest: any[]) {
    return (x: any) => rest.reduceRight((y, f) => f(y), x);
}
