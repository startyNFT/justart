import { GraphQLClient, gql } from 'graphql-request';
import { STARGAZE_GRAPHQL } from './constants';

const client = new GraphQLClient(STARGAZE_GRAPHQL);

export type NFT = {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: {
    contractAddress: string;
    name: string;
  };
};

const TOKENS_QUERY = gql`
  query TokensOwned($owner: String!, $limit: Int, $offset: Int) {
    tokens(ownerAddrOrName: $owner, limit: $limit, offset: $offset) {
      tokens {
        tokenId
        name
        description
        media {
          url
          type
        }
        collection {
          contractAddress
          name
        }
      }
      pageInfo {
        total
        offset
        limit
      }
    }
  }
`;

export async function fetchUserNFTs(
  walletAddress: string,
  limit = 50,
  offset = 0
): Promise<{ nfts: NFT[]; total: number }> {
  try {
    const data = await client.request<{
      tokens: {
        tokens: Array<{
          tokenId: string;
          name: string;
          description: string;
          media: { url: string; type: string } | null;
          collection: { contractAddress: string; name: string };
        }>;
        pageInfo: { total: number; offset: number; limit: number };
      };
    }>(TOKENS_QUERY, { owner: walletAddress, limit, offset });

    const nfts: NFT[] = data.tokens.tokens.map((token) => ({
      tokenId: token.tokenId,
      name: token.name || `#${token.tokenId}`,
      description: token.description || '',
      image: token.media?.url || '',
      collection: token.collection,
    }));

    return { nfts, total: data.tokens.pageInfo.total };
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return { nfts: [], total: 0 };
  }
}

const TOKEN_BY_ID_QUERY = gql`
  query Token($collectionAddr: String!, $tokenId: String!) {
    token(collectionAddr: $collectionAddr, tokenId: $tokenId) {
      tokenId
      name
      description
      media {
        url
        type
      }
      collection {
        contractAddress
        name
      }
    }
  }
`;

export async function fetchNFTById(
  contractAddress: string,
  tokenId: string
): Promise<NFT | null> {
  try {
    const data = await client.request<{
      token: {
        tokenId: string;
        name: string;
        description: string;
        media: { url: string; type: string } | null;
        collection: { contractAddress: string; name: string };
      } | null;
    }>(TOKEN_BY_ID_QUERY, { collectionAddr: contractAddress, tokenId });

    if (!data.token) return null;

    return {
      tokenId: data.token.tokenId,
      name: data.token.name || `#${data.token.tokenId}`,
      description: data.token.description || '',
      image: data.token.media?.url || '',
      collection: data.token.collection,
    };
  } catch (error) {
    console.error('Error fetching NFT:', error);
    return null;
  }
}
