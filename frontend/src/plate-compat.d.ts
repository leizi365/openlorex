/// <reference types="vite/client" />

import 'react';

declare module 'react' {
  interface Attributes {
    render?: React.ReactElement;
  }
}

declare module 'radix-ui' {
  namespace Popover {
    interface TriggerProps {
      render?: React.ReactElement;
    }
    interface AnchorProps {
      render?: React.ReactElement;
    }
    interface ContentProps {
      render?: React.ReactElement;
    }
  }

  namespace DropdownMenu {
    interface TriggerProps {
      render?: React.ReactElement;
    }
    interface ContentProps {
      render?: React.ReactElement;
    }
  }
}
