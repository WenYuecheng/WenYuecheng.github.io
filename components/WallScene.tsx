import type {ReactNode} from 'react';
export function WallScene({children,className=''}:{children:ReactNode;className?:string}){
 return <main id="main" className={`wall-scene ${className}`}>{children}</main>;
}
