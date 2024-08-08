import React from 'react';
import { getSession, withPageAuthRequired } from '@auth0/nextjs-auth0';

export default withPageAuthRequired(
  async function Page() {
    const { user } = await getSession();
    return (
      <>
        hello
      </>
    );
  },
  { returnTo: '/ssr' }
);
