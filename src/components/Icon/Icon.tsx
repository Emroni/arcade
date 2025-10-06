import { faGithub, IconDefinition } from '@fortawesome/free-brands-svg-icons';
import { faGear, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconProps, IconType } from './Icon.types';

const icons: Record<IconType, IconDefinition> = {
    close: faXmark,
    github: faGithub,
    settings: faGear,
};

export function Icon({ size, type }: IconProps) {
    const icon = icons[type];

    return <FontAwesomeIcon icon={icon} fontSize={size} />;
}
