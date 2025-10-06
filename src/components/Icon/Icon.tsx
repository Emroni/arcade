import { faGithub, IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { faUser } from '@fortawesome/free-regular-svg-icons';
import { faGear, faServer, faTv, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProps, IconType } from './Icon.types';

const icons: Record<IconType, IconDefinition> = {
    close: faXmark,
    github: faGithub,
    host: faServer,
    player: faUser,
    settings: faGear,
    viewer: faTv,
};

export function Icon({ size, type }: IconProps) {
    const icon = icons[type];

    return <FontAwesomeIcon icon={icon} fontSize={size} />;
}
